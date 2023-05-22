import { Service } from "../../shared/service"

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

    constructor(service: Service) {
        this.#service = service
    }

    has(key: string) {
        return this.#service.values.has(key)
    }

    get(key: string) {
        activeRule?.watchProperties.add(`${this.#service.uniqueId}/${key}`)
        return this.#service.values.get(key)
    }

    set(key: string, value: any, options?: any) {
        if (typeof options !== "undefined") {
            activeRule?.rules.constraints.set(this.#service, key, value, options.handle, options.priority, options)
            activeRule?.constraints.push(`${this.#service.uniqueId}/${key}/${options.handle}`)
        } else
            this.#service.setValue(key, value).catch(e => console.error(e))
    }
}

export class RuleDevice implements Item {
    #device: Device

    constructor(device: Device) {
        this.#device = device
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

    set(type: string, value: any, options?: any) {
        const [service, key] = this.#property(type)
        if (!service)
            return

        if (typeof options !== "undefined") {
            activeRule?.rules.constraints.set(service, key, value, options.priority, options.handle, options)
            activeRule?.constraints.push(`${service.uniqueId}/${key}/${options.handle}`)
        } else
            service.setValue(key, value).catch(e => console.error(e))
    }
}
