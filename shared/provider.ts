import Service from "./service";

export default class Provider<T extends Service> {
    readonly id: string
    #services: Map<string, T>

    constructor(id: string) {
        this.id = id
        this.#services = new Map
    }

    registerService(service: T) {
        this.#services.set(service.id, service)
    }

    get services(): ReadonlyMap<string, T> {
        return this.#services
    }
}
