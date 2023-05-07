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

    unregisterService(service: T) {
        service.removeAllListeners()
        this.emit("unregister", service)
        this.#services.delete(service.id)
    }

    get services(): ReadonlyMap<string, T> {
        return this.#services
    }
}
