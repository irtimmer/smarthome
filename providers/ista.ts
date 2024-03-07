import { CookieJar } from 'tough-cookie'
import { CookieAgent } from 'http-cookie-agent/undici'
import { HeaderGenerator } from 'header-generator'

import Provider from "../shared/provider"
import Service from "../shared/service"
import Poll from "../shared/utils/poll"

import { ISTA_SERVICE_PROPERTIES } from './ista_constants'
import Store from '../shared/store'

const INTERVAL = 60 * 60 * 24
const ISTA_BASE_URL = 'https://mijn.ista.nl'

type IstaConfig = {
    username: string
    password: string
}

export default class Ista extends Provider<IstaService> {
    constructor(id: string, config: IstaConfig, storage: Store) {
        super(id)
        const generator = new HeaderGenerator({
            httpVersion: '1',
            browsers: ['firefox'],
        });
        const headers = generator.getHeaders()

        new Poll(async () => {
            // Load from cache
            if (storage.get("updated") > Date.now() / 1000 - INTERVAL) {
                this.update(storage.get("data"))
                return
            }

            const jar = new CookieJar()
            const agent = new CookieAgent({ cookies: { jar } })
            
            await fetch(`${ISTA_BASE_URL}/Identity/Account/Login`, {
                dispatcher: agent,
                headers
            })
            const cookies = await jar.getCookies(ISTA_BASE_URL)
            const xsrf_token = cookies.find(cookie => cookie.key.startsWith(".AspNetCore.Antiforgery"))?.value
            if (!xsrf_token)
                throw new Error("No XSRF token found")

            let mainPage = await fetch(`${ISTA_BASE_URL}/Identity/Account/Login`, {
                method: "POST",
                dispatcher: agent,
                headers: {...headers, ...{
                    "content-type": "application/x-www-form-urlencoded",
                }},
                body: new URLSearchParams({
                    "txtUsername": config.username,
                    "txtPassword": config.password,
                    "__RequestVerificationToken": xsrf_token
                }).toString()
            }).then((data: any) => data.text())

            // Extract JWT token from main page
            let jwtTokenMatch = mainPage.match(/id="__twj_" value="([^"]*)"/);
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
        })
    }

    update(data: any) {
        for (const i in data["Cus"][0]["curConsumption"]["ServicesComp"]) {
            const billing = data["Cus"][0]["curConsumption"]["Billingservices"][i]
            const service = data["Cus"][0]["curConsumption"]["ServicesComp"][i]
            for (const meter of service["CurMeters"])
                this.services.get(meter["MeterNr"])?.refresh(meter) ?? this.registerService(new IstaService(this, meter, billing))
        }
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
