import { Service } from "../shared/service";

import Controller from "./controller";

export type Handler = (value: any) => Promise<boolean>;

export default class Handlers {
    #handlers: Map<Service, Map<string, Handler[]>>

    constructor(_: Controller) {
        this.#handlers = new Map
    }

    add(service: Service, key: string, handler: Handler) {
        let propertyHandlers = this.#handlers.get(service)
        if (!propertyHandlers) {
            propertyHandlers = new Map
            this.#handlers.set(service, propertyHandlers)
        }

        let handlers = propertyHandlers.get(key)
        if (!handlers) {
            handlers = []
            propertyHandlers.set(key, handlers)
        }

        handlers.push(handler)
    }

    remove(service: Service, key: string, handler: Handler) {
        let propertyHandlers = this.#handlers.get(service)
        if (!propertyHandlers)
            return false

        let handlers = propertyHandlers.get(key)
        if (!handlers)
            return false

        const index = handlers.findIndex(handler)
        if (index >= 0)
            handlers.splice(index, 1)
    }

    async setValue(service: Service, key: string, value: any): Promise<boolean> {
        let propertyHandlers = this.#handlers.get(service)
        if (!propertyHandlers)
            return false

        let handlers = propertyHandlers.get(key)
        if (!handlers)
            return false

        for (const handler of handlers) {
            let x = handler(value).catch(e => console.error(e))
            if (await x)
                return true
        }

        return false
    }
}
