import { Service } from "../../shared/service"

import Controller from "../controller"
import { Device } from "../devices"
import { Rule } from "../rule"

let activeRule: Rule | undefined

export function setActiveRule(rule?: Rule) {
    activeRule = rule
}

export interface Item {
    has(key: string): boolean
    get(key: string): any
    set(key: string, value: any): void
}

export class NullItem implements Item {
    has(_key: string) {
        return false
    }

    get(_key: string) {
        return undefined
    }

    set(_key: string, _value: any) {}
}

export class RuleService implements Item {
    #service: Service
    #controller: Controller

    constructor(service: Service, controller: Controller) {
        this.#service = service
        this.#controller = controller
    }

    has(key: string) {
        return this.#service.values.has(key)
    }

    get(key: string) {
        activeRule?.watchProperties.add(`${this.#service.uniqueId}/${key}`)
        return this.#service.values.get(key)
    }

    on(key: string, fn: (args: Record<string, any>) => void) {
        activeRule?.listeners.set(`${this.#service.uniqueId}/${key}`, fn)
    }

    set(key: string, value: any, handle?: string, priority?: number, options?: any) {
        if (handle !== undefined && priority !== undefined) {
            this.#controller.constraints.set(this.#service, key, value, handle, priority, options)
            activeRule?.constraints.add(`${this.#service.uniqueId}/${key}/${options.handle}`)
        } else
            this.#service.setValue(key, value).catch(e => console.error(e))
    }
}

export class RuleDevice implements Item {
    #device: Device
    #controller: Controller

    constructor(device: Device, controller: Controller) {
        this.#device = device
        this.#controller = controller
    }

    #property(type: string): [Service, string] | [null, null] {
        for (const service of this.#device.services)
            for (const [key, property] of service.properties)
                if (property['@type'] == type)
                    return [service, key]

        for (const service of this.#device.services)
            for (const [key, _] of service.properties)
                if (key == type)
                    return [service, key]

        return [null, null]
    }

    has(type: string) {
        const [service] = this.#property(type)
        return service != null
    }

    get(type: string) {
        const [service, key] = this.#property(type)
        if (!service)
            return

        activeRule?.watchProperties.add(`${service.uniqueId}/${key}`)
        return service.values.get(key)
    }

    set(type: string, value: any, handle?: string, priority?: number, options?: any) {
        const [service, key] = this.#property(type)
        if (!service)
            return

        if (handle !== undefined && priority !== undefined) {
            this.#controller.constraints.set(service, key, value, handle, priority, options)
            activeRule?.constraints.add(`${service.uniqueId}/${key}/${options.handle}`)
        } else
            service.setValue(key, value).catch(e => console.error(e))
    }
}
