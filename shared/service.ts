export interface Property {
    type: string
    label: string
}

export default abstract class Service {
    readonly id: string
    #values: Map<string, any>
    #properties: Map<string, Property>

    constructor(id: string) {
        this.id = id
        this.#values = new Map
        this.#properties = new Map
    }

    registerProperty(key: string, prop: Property) {
        this.#properties.set(key, prop)
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
}
