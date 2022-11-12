import EventSource from "eventsource"
import consumers from 'stream/consumers'
import { Agent, request } from "https"

import Provider from "../shared/provider"
import Service, { Property } from "../shared/service"

import { HUE_SERVICE_TYPE, HUE_SERVICE_TYPES } from "./hue_constants"

interface HueOptions {
    url: string
    key: string
}

interface HueServiceTypeProperty {
    parse: (data: any) => any
    set?: (value: any) => any
    definition: Omit<Property, 'read_only'>
}

export type HueServiceType = { [property: string]: HueServiceTypeProperty }

export default class HueProvider extends Provider<HueService> {
    #url: string
    #key: string
    #agent: Agent

    constructor(id: string, options: HueOptions) {
        super(id)
        this.#url = options.url
        this.#key = options.key

        const agentOptions = {
            rejectUnauthorized: false
        }

        this.#agent = new Agent(agentOptions)
        const events = new EventSource(`${this.#url}/eventstream/clip/v2`, {
            https: agentOptions,
            headers: {
                'hue-application-key': this.#key
            }
        });

        events.onmessage = this.#onmessage.bind(this)

        this.fetch(`/clip/v2/resource`).then(async (json: any) => {
            for (let serviceData of json.data) {
                const service = new HueService(this, serviceData.id, serviceData.type)
                this.registerService(service)

                if (serviceData.type in HUE_SERVICE_TYPE)
                    if (Array.isArray(HUE_SERVICE_TYPE[serviceData.type]))
                        for (const type of HUE_SERVICE_TYPE[serviceData.type])
                            service.registerType(type) 
                    else
                        service.registerType(HUE_SERVICE_TYPE[serviceData.type] as string)

                if (serviceData.owner)
                    service.registerIdentifier('uuid', serviceData.owner.rid)

                if (serviceData.group)
                    service.registerIdentifier('uuid', serviceData.group.rid)

                service.registerIdentifier('uuid', serviceData.id)
                service.update(serviceData)
            }
        }).catch((err: any) => {
            console.error(err)
        })
    }

    fetch(path: string, options: any = {}) {
        return new Promise((resolve, reject) => {
            let req = request(`${this.#url}${path}`, {...options, ...{
                agent: this.#agent,
                headers: {
                    'hue-application-key': this.#key
                }
            }}, response => {
                resolve(consumers.json(response))
            }).on('error', (e) => {
                reject(e)
            })

            if (options.body)
                req.write(options.body)

            req.end()
        })
    }

    #onmessage(e: MessageEvent) {
        const jsonData = JSON.parse(e.data)
        for (let event of jsonData) {
            for (let update of event.data) {
                const service = this.services.get(update.id)
                if (service)
                    service.update(update)
            }
        }
    }
}

class HueService extends Service {
    #type: string
    #typeDefinition: HueServiceType
    #provider: HueProvider

    constructor(provider: HueProvider, id: string, type: string) {
        super(id)
        this.#provider = provider
        this.#type = type
        this.name = type
        this.#typeDefinition = HUE_SERVICE_TYPES[type]
        if (this.#typeDefinition)
            for (const [key, property] of Object.entries(this.#typeDefinition))
                this.registerProperty(key, { ...property.definition, ...{
                    read_only: !('set' in property)
                }});
    }

    update(data: any) {
        if (!this.#typeDefinition)
            return

        for (const [key, value] of Object.entries(this.#typeDefinition)) {
            const parsed = value.parse(data)
            if (parsed !== undefined)
                this.updateValue(key, parsed)
        }
    }

    setValue(key: string, value: any) {
        if (this.#typeDefinition[key].set) {
            return this.#provider.fetch(`/clip/v2/resource/${this.#type}/${this.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.#typeDefinition[key].set!(value))
            }) as Promise<void>
        } else
            return Promise.reject()
    }
}
