import { CookieJar } from 'tough-cookie'
import { CookieAgent } from 'http-cookie-agent/undici'

import Provider from "../shared/provider"
import Service from "../shared/service"
import Poll from "../shared/utils/poll"

import { ISTA_SERVICE_PROPERTIES } from './ista_constants'

const ISTA_BASE_URL = 'https://mijn.ista.nl'

type IstaConfig = {
    username: string
    password: string
}

export default class Ista extends Provider<IstaService> {
    constructor(id: string, config: IstaConfig) {
        super(id)

        new Poll(async () => {
            const jar = new CookieJar()
            const agent = new CookieAgent({ cookies: { jar } })
            
            await fetch(`${ISTA_BASE_URL}/Identity/Account/Login`, { dispatcher: agent })
            const cookies = await jar.getCookies(ISTA_BASE_URL)
            const xsrf_token = cookies.find(cookie => cookie.key.startsWith(".AspNetCore.Antiforgery"))?.value
            if (!xsrf_token)
                throw new Error("No XSRF token found")

            let mainPage = await fetch(`${ISTA_BASE_URL}/Identity/Account/Login`, {
                method: "POST",
                dispatcher: agent,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
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
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "JWT": jwtToken,
                    "LANG": "en-US"
                })
            }).then((data: any) => data.json())

            for (const service of data["Cus"][0]["curConsumption"]["ServicesComp"]) {
                for (const meter of service["CurMeters"])
                    this.services.get(meter["MeterId"])?.refresh(meter) ?? this.registerService(new IstaService(this, meter))
            }
        }, {
            interval: 60 * 60 * 24,
            retryInterval: 5 * 60
        })
    }
}

class IstaService extends Service<Ista> {
    constructor(provider: Ista, data: any) {
        super(provider, data["MeterId"])
        this.registerType("sensor")
        this.registerIdentifier("ista", data["MeterId"])
        this.name = "Meter"

        for (const [key, property] of Object.entries(ISTA_SERVICE_PROPERTIES))
            this.registerProperty(key, typeof property.definition === "string" ? property.definition : { ...property.definition, ...{
                read_only: true
            }}, property.parse(data))
    }

    refresh(data: any) {
        for (const [key, property] of Object.entries(ISTA_SERVICE_PROPERTIES))
            this.updateValue(key, property.parse(data))

        return this
    }
}