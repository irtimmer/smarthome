import { EventEmitter } from "stream";
import { Logger } from "pino";

import { Service } from "./service";
import logging from "./logging";
import Task from "./task";

export default class Provider<T extends Service> extends EventEmitter {
    readonly id: string
    #services: Map<string, T>
    #tasks: Map<string, Task>
    logger: Logger

    constructor(id: string) {
        super()
        this.id = id
        this.#services = new Map
        this.#tasks = new Map

        this.logger = logging().child({ module: id });
    }

    registerTask(name: string, task: Task) {
        task.logger = this.logger.child({ id: name })
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
