import { EventEmitter } from "stream";

import { Service } from "./service";

export default class Provider<T extends Service> extends EventEmitter {
    readonly id: string
    #services: Map<string, T>

    constructor(id: string) {
        super()
        this.id = id
        this.#services = new Map
    }

    registerService(service: T) {
        this.#services.set(service.id, service)
        this.emit("register", service)
    }

    get services(): ReadonlyMap<string, T> {
        return this.#services
    }
}
