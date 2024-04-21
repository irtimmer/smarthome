import { EventEmitter } from "stream";

import { Service } from "./service";
import Task from "./task";

export default class Provider<T extends Service> extends EventEmitter {
    readonly id: string
    #services: Map<string, T>
    #tasks: Map<string, Task>

    constructor(id: string) {
        super()
        this.id = id
        this.#services = new Map
        this.#tasks = new Map
    }

    registerTask(name: string, task: Task) {
        this.#tasks.set(name, task)
    }

    registerService(service: T): T {
        this.#services.set(service.id, service)
        this.emit("register", service)
        return service
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
