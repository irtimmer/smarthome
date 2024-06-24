import { EventEmitter } from "stream";
import { Logger } from "pino";

import { Service } from "./service";
import Task from "./task";
import Store from "./store";

export interface ProviderManager {
    readonly id: string
    readonly logger: Logger
    readonly storage: Store

    getConnection(name: string): Promise<any>
}

export default class Provider<T extends Service> extends EventEmitter {
    readonly id: string
    #services: Map<string, T>
    #tasks: Map<string, Task>
    logger: Logger

    constructor(manager: ProviderManager) {
        super()
        this.id = manager.id
        this.#services = new Map
        this.#tasks = new Map
        this.logger = manager.logger
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
