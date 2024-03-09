import { EventEmitter } from "stream"

import { Action, Property, ServiceEvent } from "./definitions"
import Provider from "./provider"
import { SERVICE_PROPERTIES } from "./service_constants"

export interface Service extends EventEmitter {
    readonly id: string
    readonly uniqueId: string
    readonly name: string
    readonly priority: number

    readonly identifiers: ReadonlySet<string>
    readonly provider: Provider<Service>
    readonly types: ReadonlySet<string>

    readonly properties: ReadonlyMap<string, Property>
    readonly values: ReadonlyMap<string, any>
    readonly actions: ReadonlyMap<string, Action>
    readonly events: ReadonlyMap<string, ServiceEvent>

    setValue(key: string, value: any): Promise<void>;
    triggerAction(key: string, props: any): Promise<void>;
}

export default abstract class AbstractService<T extends Provider<Service>> extends EventEmitter implements Service {
    readonly id: string
    readonly provider: T
    priority: number
    #values: Map<string, any>
    #properties: Map<string, Property>
    #actions: Map<string, Action>
    #events: Map<string, ServiceEvent>
    #identifiers: Set<string>
    #types: Set<string>
    #name?: string

    constructor(provider: T, id: string) {
        super()
        this.id = id
        this.provider = provider
        this.priority = 0
        this.#values = new Map
        this.#properties = new Map
        this.#actions = new Map
        this.#events = new Map
        this.#identifiers = new Set
        this.#types = new Set
    }

    registerProperty(key: string, prop: Property | string, value?: any) {
        if (typeof prop === "string")
            this.#properties.set(key, { ...SERVICE_PROPERTIES[prop], ...{
                '@type': prop
            }})
        else
            this.#properties.set(key, prop)

        if (value !== undefined)
            this.updateValue(key, value)
    }

    registerType(type: string) {
        this.#types.add(type)
    }

    registerIdentifier(type: string, id: string) {
        if (this.#identifiers.has(`${type}:${id}`))
            return

        this.#identifiers.add(`${type}:${id}`)
        this.emit("identifier", type, id)
    }

    registerAction(key: string, action: Action) {
        this.#actions.set(key, action)
    }

    registerEvent(key: string, event: ServiceEvent) {
        this.#events.set(key, event)
    }

    updateTypes(types: string[] | string) {
        this.#types.clear()
        if (Array.isArray(types))
            types.forEach(t => this.registerType(t))
        else
            this.registerType(types)
    }

    updateIdentifiers(ids: [string, string][]) {
        this.#identifiers.clear()
        ids.forEach(([key, id]) => this.registerIdentifier(key, id))
    }

    updateValue(key: string, value: any) {
        const oldValue = this.#values.get(key)
        if (value != oldValue) {
            this.#values.set(key, value)
            this.emit("update", key, value, oldValue)
        }
    }

    emitEvent(key: string, args: Record<string, any>) {
        this.emit("event", key, args)
    }

    async setValue(key: string, value: any) {
        throw new Error("Method not implemented.");
    }

    async triggerAction(key: string, props: any) {
        throw new Error("Method not implemented.");
    }

    get name(): string {
        return this.#name!
    }

    set name(value: string) {
        this.#name = value
    }

    get values(): ReadonlyMap<string, any> {
        return this.#values
    }

    get properties(): ReadonlyMap<string, Property> {
        return this.#properties
    }

    get identifiers(): ReadonlySet<string> {
        return this.#identifiers
    }

    get actions(): ReadonlyMap<string, Action> {
        return this.#actions
    }

    get events(): ReadonlyMap<string, ServiceEvent> {
        return this.#events
    }

    get types(): ReadonlySet<string> {
        return this.#types
    }

    get uniqueId(): string {
        return `${this.provider.id}:${this.id}`
    }
}
