import EventSource from "eventsource"
import consumers from 'stream/consumers'
import { Agent, request } from "https"

import { Semaphore } from "../shared/utils/semaphore"

import { Action, Property } from "../shared/definitions"
import Provider from "../shared/provider"
import Service from "../shared/service"

import { HUE_SERVICE_TYPE, HUE_SERVICE_TYPES, HUE_SERVICE_ACTIONS, HUE_SERVICE_PRIORITIES } from "./hue_constants"

interface HueOptions {
    url: string
    key: string
}

interface HueServiceTypeProperty {
    parse: (data: any) => any
    set?: (value: any) => any
    definition: Omit<Property, 'read_only'> | string
}

interface HueServiceTypeAction {
    trigger: (props: any) => any
    definition: Action
}

export type HueServiceType = { [property: string]: HueServiceTypeProperty }
export type HueServiceActionType = { [action: string]: HueServiceTypeAction }

export default class HueProvider extends Provider<HueService> {
    #url: string
    #key: string
    #agent: Agent
    #lock: Semaphore

    constructor(id: string, options: HueOptions) {
        super(id)
        this.#lock = new Semaphore
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
                const service = new HueService(this, serviceData)
                this.registerService(service)

                if (serviceData.type in HUE_SERVICE_TYPE)
                    if (Array.isArray(HUE_SERVICE_TYPE[serviceData.type]))
                        for (const type of HUE_SERVICE_TYPE[serviceData.type])
                            service.registerType(type) 
                    else
                        service.registerType(HUE_SERVICE_TYPE[serviceData.type] as string)

                if (serviceData.owner)
                    service.registerIdentifier('uuid', serviceData.owner.rid)

                if (serviceData.script_id)
                    service.registerIdentifier('uuid', serviceData.script_id)

                if (serviceData.group)
                    service.registerIdentifier('uuid', serviceData.group.rid)

                service.registerIdentifier('uuid', serviceData.id)
                service.update(serviceData, false)
            }
        }).catch((err: any) => {
            console.error(err)
        })
    }

    fetch(path: string, options: any = {}) {
        return new Promise((resolve, reject) => this.#lock.take(done => {
            let req = request(`${this.#url}${path}`, {...options, ...{
                agent: this.#agent,
                headers: {
                    'hue-application-key': this.#key
                }
            }}, response => {
                resolve(consumers.json(response))
                response.on("close", done)
            }).on('error', (e) => {
                reject(e)
                done()
            })

            if (options.body)
                req.write(options.body)

            req.end()
        }))
    }

    #onmessage(e: MessageEvent) {
        const jsonData = JSON.parse(e.data)
        for (let event of jsonData) {
            for (let update of event.data)
                this.services.get(update.id)?.update(update, true)
        }
    }
}

class HueService extends Service<HueProvider> {
    #type: string
    #typeDefinition: HueServiceType
    #typeActionDefinitions: HueServiceActionType

    constructor(provider: HueProvider, data: any) {
        super(provider, data.id)
        this.#type = data.type
        this.name = data.type
        this.priority = HUE_SERVICE_PRIORITIES[this.#type] ?? 0
        this.#typeDefinition = HUE_SERVICE_TYPES[this.#type]
        if (this.#typeDefinition)
            for (const [key, property] of Object.entries(this.#typeDefinition))
                this.registerProperty(key, typeof property.definition === "string" ? property.definition : { ...property.definition, ...{
                    read_only: !('set' in property)
                }})

        this.#typeActionDefinitions = HUE_SERVICE_ACTIONS[this.#type]
        if (this.#typeActionDefinitions)
            Object.entries(this.#typeActionDefinitions).forEach(([key, action]) => this.registerAction(key, action.definition))

        if (this.#type == 'button')
            this.registerEvent("key", {
                label: "Key pressed",
                properties: {
                    event: {
                        label: "Event",
                        type: "string"
                    }
                }
            })
    }

    update(data: any, fireEvents: boolean) {
        if (!this.#typeDefinition)
            return

        if (fireEvents && this.#type == 'button') {
            if (data.button?.last_event != this.values.get("event"))
                this.emitEvent("key", {
                    event: data.button.last_event
                })
        }

        for (const [key, value] of Object.entries(this.#typeDefinition)) {
            const parsed = value.parse(data)
            if (parsed !== undefined)
                this.updateValue(key, parsed)
        }
    }

    triggerAction(key: string, props: any) {
        if (this.#typeActionDefinitions && this.#typeActionDefinitions[key]) {
            return this.provider.fetch(`/clip/v2/resource/${this.#type}/${this.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.#typeActionDefinitions[key].trigger!(props))
            }) as Promise<void>
        } else
            return Promise.reject()
    }

    setValue(key: string, value: any) {
        if (this.#typeDefinition[key].set) {
            return this.provider.fetch(`/clip/v2/resource/${this.#type}/${this.id}`, {
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
