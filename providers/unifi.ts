import consumers from 'stream/consumers'
import { Agent, request } from "https"

import { CookieJar } from 'tough-cookie';
import { HttpsCookieAgent } from 'http-cookie-agent/http';

import Provider, { ProviderManager } from "../shared/provider";
import Service from "../shared/service";
import Poll from "../shared/utils/poll";

import { UNIFI_SERVICE_PROPERTIES } from './unifi_constants';

type UnifiConfig = {
    url: string
    username: string
    password: string
}

export default class Unifi extends Provider<UnifiService> {
    #agent: Agent
    #url: string
    #username: string
    #password: string

    constructor(manager: ProviderManager, config: UnifiConfig) {
        super(manager)
        this.#url = config.url
        this.#username = config.username
        this.#password = config.password

        const jar = new CookieJar();
        this.#agent = new HttpsCookieAgent({
            rejectUnauthorized: false,
            cookies: { jar }
        })

        this.registerTask("poll", new Poll(async () => {
            const data = await this.fetch('/api/self/sites')
            const site_name = data.data[0].name
            const devices = await this.fetch(`/api/s/${site_name}/stat/sta`)

            const seen_devices = new Set
            for (const device of devices.data) {
                this.services.get(device._id)?.refresh(device) ?? this.registerService(new UnifiService(this, device))
                seen_devices.add(device._id)
            }

            for (const service of this.services.values())
                service.updateValue("_connected", seen_devices.has(service.id))
        }))
    }

    fetch(path: string, options: any = {}): Promise<any> {
        return new Promise((resolve, reject) => {
            let req = request(`${this.#url}${path}`, {...options, ...{
                headers: {
                    'Content-Type': 'application/json'
                },
                agent: this.#agent,
            }}, response => {
                consumers.json(response).then(async (data: any) => {
                    if (data?.meta?.rc == 'error') {
                        if (data.meta.msg == 'api.err.LoginRequired' && path != '/api/login') {
                            let login_data = await this.fetch('/api/login', {
                                method: 'POST',
                                body: JSON.stringify({
                                    username: this.#username,
                                    password: this.#password
                                }),
                            });
                            if (login_data?.meta?.rc == 'ok')
                                return await this.fetch(path, options)

                        }

                        throw data.meta.msg
                    }

                    return data
                }).then(resolve).catch(reject)
            }).on('error', (e) => {
                reject(e)
            })

            if (options.body)
                req.write(options.body)

            req.end()
        })
    }
}

class UnifiService extends Service<Unifi> {
    constructor(provider: Unifi, device: any) {
        super(provider, device._id)
        this.name = "Endpoint"
        this.priority = -10
        this.registerIdentifier("mac", device.mac.replaceAll(':', ''))
        this.registerIdentifier("ip", device.ip)
        this.registerType("endpoint")
        this.registerProperty("_connected", "connected", true)

        for (const [key, property] of Object.entries(UNIFI_SERVICE_PROPERTIES))
            this.registerProperty(key, typeof property.definition === "string" ? property.definition : { ...property.definition, ...{
                read_only: true
            }}, property.parse(device))
    }

    refresh(data: any) {
        for (const [key, property] of Object.entries(UNIFI_SERVICE_PROPERTIES))
            this.updateValue(key, property.parse(data))

        return this
    }
}
