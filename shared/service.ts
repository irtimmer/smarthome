import { EventEmitter } from "stream"

import Provider from "./provider"

export interface Property {
    '@type'?: string
    type: string
    label: string
    read_only: boolean
}

export interface Action {
    label: string
}

export default abstract class Service<T extends Provider<any>> extends EventEmitter {
    readonly id: string
    readonly provider: T
    #values: Map<string, any>
    #properties: Map<string, Property>
    #actions: Map<string, Action> 
    #identifiers: Set<string>
    #types: Set<string>
    #name?: string

    constructor(provider: T, id: string) {
        super()
        this.id = id
        this.provider = provider
        this.#values = new Map
        this.#properties = new Map
        this.#actions = new Map
        this.#identifiers = new Set
        this.#types = new Set
    }

    registerProperty(key: string, prop: Property) {
        this.#properties.set(key, prop)
    }

    registerType(type: string) {
        this.#types.add(type)
    }

    registerIdentifier(type: string, id: string) {
        this.#identifiers.add(`${type}:${id}`)
        this.emit("identifier", this, type, id)
    }

    registerAction(key: string, action: Action) {
        this.#actions.set(key, action)
    }

    updateValue(key: string, value: any) {
        const oldValue = this.#values.get(key)
        if (value != oldValue) {
            this.#values.set(key, value)
            this.emit("update", this, key, value, oldValue)
        }
    }

    abstract setValue(key: string, value: any): Promise<void>;
    abstract triggerAction(key: string, props: any): Promise<void>;

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

    get types(): ReadonlySet<string> {
        return this.#types
    }
}
