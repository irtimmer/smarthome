import { HttpClient, RequestOptions, request } from 'urllib'

import Poll from "../shared/utils/poll"
import Provider, { ProviderManager } from "../shared/provider"
import Service from "../shared/service"

import { PHILIPS_TV_ACTIONS, PHILIPS_TV_PROPERTIES } from "./philipstv_constants"

type PhilipsTvConfig = {
    url: string
    username: string
    password: string
}

export default class PhilipsTVProvider extends Provider<Service<PhilipsTVProvider>> {
    #config: PhilipsTvConfig
    #client: HttpClient
    #currentState: any

    constructor(manager: ProviderManager, config: PhilipsTvConfig) {
        super(manager)
        this.#config = config

        this.#currentState = {}
        for (const endpoint in PHILIPS_TV_PROPERTIES)
            this.#currentState[endpoint] = {}

        this.#client = new HttpClient({
            connect: {
                rejectUnauthorized: false,
            },
        });

        let connected = false
        this.registerTask("notifyChange", new Poll(async () => {
            try {
                let res = await this.request('notifychange', {
                    method: 'POST',
                    data: {
                        notification: this.#currentState
                    },
                    timeout: (2 * 60 + 5) * 1000
                })

                for (const [endpoint, data] of Object.entries(res.data))
                    this.#updateService(endpoint, data)

                this.#currentState = res.data
            } catch (e: any) {
                if (!(e.constructor.name == 'SocketError' && e.code == 'UND_ERR_SOCKET')) {
                    connected = false
                    throw e
                }
            }
            connected = true
        }, {
            interval: 1
        }))

        this.registerTask("scan", new Poll(async () => {
            if (!connected)
                return

            for (const [endpoint, actions] of Object.entries(PHILIPS_TV_ACTIONS)) {
                const id = endpoint.replace('/', '-')
                let service = this.services.get(id);
                if (!service) {
                    service = this.registerService(new PhilipsTVService(this, id))

                    for (const [key, action] of Object.entries(actions))
                        service.registerAction(key, action.definition)
                }
            }

            for (const endpoint in PHILIPS_TV_PROPERTIES) {
                if (!(endpoint in this.#currentState)) {
                    await this.request(endpoint).then(res => {
                        this.#updateService(endpoint, res.data)
                    })
                }
            }
        }))
    }

    #updateService(endpoint: string, data: any) {
        const properties = PHILIPS_TV_PROPERTIES[endpoint]
        const id = endpoint.replace('/', '-')
        let service = this.services.get(id)
        if (!service) {
            service = new PhilipsTVService(this, id)
            this.registerService(service)

            for (const [key, property] of Object.entries(properties)) {
                service.registerProperty(key, {...{
                    read_only: !('set' in property)
                }, ...property.definition})
            }
        }

        for (const [key, property] of Object.entries(properties))
            service.updateValue(key, property.parse(data))
    }

    request(path: string, options?: Partial<RequestOptions>) {
        return this.#client.request(`${this.#config.url}/${path}`, {...{
            digestAuth: `${this.#config.username}:${this.#config.password}`,
            contentType: 'json',
            dataType: 'json'
        }, ...options})
    }
}

class PhilipsTVService extends Service<PhilipsTVProvider> {
    constructor(provider: PhilipsTVProvider, id: string) {
        super(provider, id);
        this.registerIdentifier("provider", provider.id)
        this.registerType("television")
    }

    async setValue(key: string, value: any) {
        const id = this.id.replace('-', '/')
        const property = PHILIPS_TV_PROPERTIES[id][key]
        if (property && property.set) {
            await this.provider.request(id, {
                method: 'POST',
                content: JSON.stringify(property.set(value))
            }).catch(e => console.error(e))
        } else
            throw new Error("Property not found")
    }

    async triggerAction(key: string, props: any): Promise<void> {
        const id = this.id.replace('-', '/')
        const action: any = PHILIPS_TV_ACTIONS[id][key]
        if (action && action.trigger) {
            await this.provider.request(id, {
                method: 'POST',
                content: JSON.stringify(action.trigger(props))
            }).catch(e => console.error(e))
        } else
            throw new Error("Action not found")
    }
}
