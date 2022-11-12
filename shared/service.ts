import { EventEmitter } from "stream"

export interface Property {
    '@type'?: string
    type: string
    label: string
}

export default abstract class Service extends EventEmitter {
    readonly id: string
    #values: Map<string, any>
    #properties: Map<string, Property>
    #identifiers: Set<string>
    #types: Set<string>
    #name?: string

    constructor(id: string) {
        super()
        this.id = id
        this.#values = new Map
        this.#properties = new Map
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

    updateValue(key: string, value: any) {
        this.#values.set(key, value)
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

    get types(): ReadonlySet<string> {
        return this.#types
    }
}
