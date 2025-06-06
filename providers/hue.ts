import EventSource from "eventsource"
import consumers from 'stream/consumers'
import { Agent, request } from "https"

import { Semaphore } from "../shared/utils/semaphore"

import { Action, Property } from "../shared/definitions"
import Provider, { ProviderManager } from "../shared/provider"
import Service from "../shared/service"
import Poll from "../shared/utils/poll"

import { HUE_SERVICE_TYPE, HUE_SERVICE_TYPES, HUE_SERVICE_ACTIONS, HUE_SERVICE_PRIORITIES } from "./hue_constants"

interface HueOptions {
    url: string
    key: string
}

interface HueServiceTypeProperty {
    parse: (data: any) => any
    supported?: (data: any) => any
    set?: (value: any) => any
    definition: Omit<Property, 'read_only'> | ((data: any) => Omit<Property, 'read_only'>) | string
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
    #bridge?: HueService

    constructor(manager: ProviderManager, options: HueOptions) {
        super(manager)
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
        this.registerTask("connect", new Poll(this.#connect.bind(this), {
            interval: 60 * 60
        }))
    }

    async #connect() {
        const seen_services = new Set
        let json = await this.fetch(`/clip/v2/resource`)

        let bridge_data = json.data.filter((serviceData: any) => serviceData.type == "bridge")[0]
        if (!this.#bridge) {
            this.#bridge = this.registerService(new HueService(this, bridge_data))
            this.#bridge.updateTypes(HUE_SERVICE_TYPE.bridge)
            this.#bridge.registerIdentifier('uuid', bridge_data.id)
            this.#bridge.registerIdentifier('uuid', bridge_data.owner.rid)
            this.#bridge.update(bridge_data, false)
        }

        for (let serviceData of json.data) {
            seen_services.add(serviceData.id)
            if (this.services.has(serviceData.id))
                continue

            const service = this.registerService(new HueService(this, serviceData))

            if (serviceData.type in HUE_SERVICE_TYPE)
                service.updateTypes(HUE_SERVICE_TYPE[serviceData.type])

            if (serviceData.owner)
                service.registerIdentifier('uuid', serviceData.owner.rid)
            else if (serviceData.script_id)
                service.registerIdentifier('uuid', serviceData.script_id)
            else if (serviceData.group)
                service.registerIdentifier('uuid', serviceData.group.rid)

            service.registerIdentifier('uuid', serviceData.id)
            service.update(serviceData, false)
        }

        // Remove services that are no longer present
        this.services.forEach(service => {
            if (!seen_services.has(service.id))
                this.unregisterService(service)
        })

        let services = Array.from(this.services.values())
        this.#bridge.updateValue("_scripts", Array.from(services.filter(s => s.types.has('controller')).map(s => s.identifiers.values().next().value)))
        this.#bridge.updateValue("_apis", Array.from(services.filter(s => s.types.has("api")).map(s => s.identifiers.values().next().value)))
    }

    fetch(path: string, options: any = {}): Promise<any> {
        return new Promise((resolve, reject) => this.#lock.take(done => {
            let req = request(`${this.#url}${path}`, {...options, ...{
                agent: this.#agent,
                headers: {
                    'hue-application-key': this.#key
                }
            }}, response => {
                if (response.statusCode == 429)
                    resolve(consumers.text(response).then(t => reject(t)))
                else
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
        this.name = data.type.replace('_', ' ')
        this.priority = HUE_SERVICE_PRIORITIES[this.#type] ?? 0
        this.#typeDefinition = HUE_SERVICE_TYPES[this.#type]
        if (this.#typeDefinition) {
            const properties = Object.entries(this.#typeDefinition).filter(([_, prop]) => prop.supported === undefined || prop.supported(data))
            for (const [key, property] of properties) {
                const definition = typeof property.definition === "function" ? property.definition(data) : property.definition
                this.registerProperty(key, typeof definition === "string" ? definition : { ...definition, ...{
                    read_only: !('set' in property)
                }})
            }
        }

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

    async triggerAction(key: string, props: any) {
        if (this.#typeActionDefinitions && this.#typeActionDefinitions[key]) {
            await this.provider.fetch(`/clip/v2/resource/${this.#type}/${this.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.#typeActionDefinitions[key].trigger!(props))
            })
        } else
            throw new Error("Action not found")
    }

    async setValue(key: string, value: any) {
        if (this.#typeDefinition[key].set) {
            await this.provider.fetch(`/clip/v2/resource/${this.#type}/${this.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.#typeDefinition[key].set!(value))
            })
        } else
            throw new Error("Property not found")
    }
}
