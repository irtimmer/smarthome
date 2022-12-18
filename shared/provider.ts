import Service from "./service";

import { EventEmitter } from "stream";

export default class Provider<T extends Service<any>> extends EventEmitter {
    readonly id: string
    #services: Map<string, T>

    constructor(id: string) {
        super()
        this.id = id
        this.#services = new Map
    }

    registerService(service: T) {
        this.emit("register", this, service)
        this.#services.set(service.id, service)
    }

    get services(): ReadonlyMap<string, T> {
        return this.#services
    }
}
