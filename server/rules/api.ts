import { Service } from "../../shared/service"

import { Device } from "../devices"
import { Rule } from "../rule"

let activeRule: Rule | undefined

export function setActiveRule(rule?: Rule) {
    activeRule = rule
}

export class RuleService {
    #service: Service

    constructor(service: Service) {
        this.#service = service
    }

    get(key: string): any {
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

export class RuleDevice {
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

    get(type: string): any {
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
