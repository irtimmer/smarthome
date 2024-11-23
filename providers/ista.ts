import { CookieJar } from 'tough-cookie'
import { CookieAgent } from 'http-cookie-agent/undici'
import { HeaderGenerator } from 'header-generator'

import Provider, { ProviderManager } from "../shared/provider"
import Service from "../shared/service"
import Poll from "../shared/utils/poll"

import { ISTA_SERVICE_PROPERTIES } from './ista_constants'

const INTERVAL = 60 * 60 * 24
const ISTA_BASE_URL = 'https://mijn.ista.nl'

type IstaConfig = {
    username: string
    password: string
}

function unescapeHtml(unsafe: string) {
    return unsafe.replace(/&amp;/g, '&')
}

export default class Ista extends Provider<IstaService> {
    constructor(manager: ProviderManager, config: IstaConfig) {
        super(manager)
        const storage = manager.storage
        const generator = new HeaderGenerator({
            httpVersion: '1',
            browsers: ['firefox'],
        });
        const headers = generator.getHeaders()

        this.registerTask("poll", new Poll(async () => {
            // Load from cache
            if (storage.get("updated") > Date.now() / 1000 - INTERVAL) {
                this.update(storage.get("data"))
                return
            }

            const jar = new CookieJar()
            const agent = new CookieAgent({ cookies: { jar } })
            
            let usernamePage = await fetch(`${ISTA_BASE_URL}/home/index`, {
                dispatcher: agent,
                headers
            }).then((data: any) => data.text())

            let formUrlMatch = usernamePage.match(/action="(https:\/\/login.ista.com\/[^"]*)"/);
            let formUrl = formUrlMatch ? unescapeHtml(formUrlMatch[1]) : null;
            if (!formUrl)
                throw new Error("No username form url found")

            let passwordPage = await fetch(formUrl, {
                method: "POST",
                dispatcher: agent,
                headers: {...headers, ...{
                    "content-type": "application/x-www-form-urlencoded",
                }},
                body: new URLSearchParams({
                    "username": config.username
                }).toString()
            }).then((data: any) => data.text())

            formUrlMatch = passwordPage.match(/action="(https:\/\/login.ista.com\/[^"]*)"/);
            formUrl = formUrlMatch ? unescapeHtml(formUrlMatch[1]) : null;
            if (!formUrl)
                throw new Error("No password form url found")

            let oidcPage = await fetch(formUrl, {
                method: "POST",
                dispatcher: agent,
                headers: {...headers, ...{
                    "content-type": "application/x-www-form-urlencoded",
                }},
                body: new URLSearchParams({
                    "password": config.password
                }).toString()
            }).then((data: any) => data.text())

            let codeMatch = oidcPage.match(/NAME="code" VALUE="([^"]*)"/);
            let stateMatch = oidcPage.match(/NAME="state" VALUE="([^"]*)"/);
            let sessionStateMatch = oidcPage.match(/NAME="session_state" VALUE="([^"]*)"/);

            let code = codeMatch ? codeMatch[1] : null;
            let state = stateMatch ? stateMatch[1] : null;
            let sessionState = sessionStateMatch ? sessionStateMatch[1] : null;
            if (!code || !state || !sessionState)
                throw new Error("No code, state or session state found")

            let signinPage = await fetch(`${ISTA_BASE_URL}/signin-oidc`, {
                method: "POST",
                dispatcher: agent,
                headers: {...headers, ...{
                    "content-type": "application/x-www-form-urlencoded",
                }},
                body: new URLSearchParams({
                    "code": code,
                    "state": state,
                    "session_state": sessionState
                }).toString()
            }).then((data: any) => data.text())

            // Extract JWT token from main page
            let jwtTokenMatch = signinPage.match(/id="__twj_" value="([^"]*)"/);
            let jwtToken = jwtTokenMatch ? jwtTokenMatch[1] : null;
            if (!jwtToken)
                throw new Error("No JWT token found")

            let data = await fetch(`${ISTA_BASE_URL}/api/Values/UserValues`, {
                method: "POST",
                headers: {...headers, ...{
                    "content-type": "application/json",
                }},
                body: JSON.stringify({
                    "JWT": jwtToken,
                    "LANG": "en-US"
                })
            }).then((data: any) => data.json())

            storage.set("data", data)
            storage.set("updated", Date.now() / 1000)
            this.update(data)
        }, {
            interval: INTERVAL,
            retryInterval: 60 * 60
        }))
    }

    update(data: any) {
        const seen_services = new Set

        for (const i in data["Cus"][0]["curConsumption"]["ServicesComp"]) {
            const billing = data["Cus"][0]["curConsumption"]["Billingservices"][i]
            const service = data["Cus"][0]["curConsumption"]["ServicesComp"][i]
            for (const meter of service["CurMeters"]) {
                seen_services.add(meter["MeterNr"])
                this.services.get(meter["MeterNr"])?.refresh(meter) ?? this.registerService(new IstaService(this, meter, billing))
            }
        }

        // Unregister services that are no longer present
        this.services.forEach(service => {
            if (!seen_services.has(service.id))
                this.unregisterService(service)
        })
    }
}

class IstaService extends Service<Ista> {
    constructor(provider: Ista, data: any, billingService: any) {
        super(provider, data["MeterNr"])
        this.registerType("sensor")
        this.registerIdentifier("ista", data["MeterNr"])
        this.name = "Meter"

        for (const [key, property] of Object.entries(ISTA_SERVICE_PROPERTIES)) {
            const definition = typeof property.definition === "function" ? property.definition(data, billingService) : property.definition
            this.registerProperty(key, typeof definition === "string" ? definition : { ...definition, ...{
                read_only: true
            }}, property.parse(data))
        }
    }

    refresh(data: any) {
        for (const [key, property] of Object.entries(ISTA_SERVICE_PROPERTIES))
            this.updateValue(key, property.parse(data))

        return this
    }
}
