export interface Property {
    type: string
    label: string
}

export default abstract class Service {
    readonly id: string
    #values: Map<string, any>
    #properties: Map<string, Property>
    #identifiers: Set<string>

    constructor(id: string) {
        this.id = id
        this.#values = new Map
        this.#properties = new Map
        this.#identifiers = new Set
    }

    registerProperty(key: string, prop: Property) {
        this.#properties.set(key, prop)
    }

    registerIdentifier(type: string, id: string) {
        this.#identifiers.add(`${type}:${id}`)
    }

    updateValue(key: string, value: any) {
        this.#values.set(key, value)
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
}
