import { Service } from "../../shared/service"

import Controller from "../controller"
import { Device } from "../devices"
import { ServiceFilter, matchServiceFilter } from "../filters"
import { Handler } from "../handlers"
import { Rule } from "../rule"

let activeRule: Rule | undefined

export const itemProxyHandler: ProxyHandler<Item> = {
    get(target, prop, receiver) {
        if (target.has(prop.toString()))
            return target.get(prop.toString())
        else {
            const value = Reflect.get(target, prop, receiver)
            return typeof value == 'function' ? (...args: any[]) => {
                const ret = value.bind(target)(...args)
                return ret instanceof Item ? new Proxy(ret, itemProxyHandler) : ret
            } : value;
        }
    },
    set(target, prop, value) {
        if (target.has(prop.toString())) {
            target.set(prop.toString(), value)
            return true
        }

        return Reflect.set(target, prop, value)
    }
}

export function setActiveRule(rule?: Rule) {
    activeRule = rule
}

export abstract class Item {
    abstract has(key: string): boolean
    abstract get(key: string): any
    abstract set(key: string, value: any): void
}

export class NullItem extends Item {
    has(_key: string) {
        return false
    }

    get(_key: string) {
        return undefined
    }

    set(_key: string, _value: any) {}
}

export class RuleService extends Item {
    #service: Service
    #controller: Controller

    constructor(service: Service, controller: Controller) {
        super()
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

    isSet(key: string, handle: string) {
        return this.#controller.constraints.isSet(this.#service, key, handle)
    }

    unset(key: string, handle: string) {
        this.#controller.constraints.unset(this.#service, key, handle)
    }

    set(key: string, value: any, handle?: string, priority?: number, options?: any): Promise<void> | void {
        if (handle !== undefined && priority !== undefined) {
            this.#controller.constraints.set(this.#service, key, value, handle, priority, options)
            activeRule?.constraints.add(`${this.#service.uniqueId}/${key}/${handle}`)
        } else
            return this.#controller.setValue(this.#service, key, value).catch(e => console.error(e))
    }

    trigger(key: string, args: any): Promise<void> {
        return this.#service.triggerAction(key, args)
    }

    handle(key: string, handler: Handler) {
        this.#controller.handlers.add(this.#service, key, handler)
        activeRule?.handlers.set(`${this.#service.uniqueId}/${key}`, handler)
    }
}

export class RuleServices extends Item {
    #services: Service[]
    #controller: Controller

    constructor(services: Service[], controller: Controller) {
        super()
        this.#services = services
        this.#controller = controller
    }

    has(key: string) {
        return this.#services.some(service => service.values.has(key))
    }

    get(key: string) {
        return this.#services.filter(service => service.values.has(key))
            .map(service => {
                activeRule?.watchProperties.add(`${service.uniqueId}/${key}`)
                return service.values.get(key)
            })
    }

    on(key: string, fn: (args: Record<string, any>, service: Item) => void) {
        this.#services.forEach(service => activeRule?.listeners.set(`${service.uniqueId}/${key}`, args => fn(args, new Proxy(new RuleService(service, this.#controller), itemProxyHandler))))
    }

    isSet(key: string, handle: string) {
        return this.#services.some(service => this.#controller.constraints.isSet(service, key, handle))
    }

    unset(key: string, handle: string) {
        this.#services.forEach(service => this.#controller.constraints.unset(service, key, handle))
    }

    set(key: string, value: any, handle?: string, priority?: number, options?: any): Promise<void> | void {
        if (handle !== undefined && priority !== undefined) {
            this.#services.filter(service => service.values.has(key))
                .forEach(service => {
                    this.#controller.constraints.set(service, key, value, handle, priority, options)
                    activeRule?.constraints.add(`${service.uniqueId}/${key}/${handle}`)
                })
        } else
            return Promise.all(this.#services.map(service => this.#controller.setValue(service, key, value).catch(e => console.error(e)))).then(() => {})
    }

    trigger(key: string, args: any): Promise<void> {
        return Promise.all(this.#services.filter(service => service.actions.has(key))
                .map(service => service.triggerAction(key, args))).then(() => {})
    }
}

export class RuleDevice extends Item {
    #device: Device
    #controller: Controller

    constructor(device: Device, controller: Controller) {
        super()
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

    getServices(filter: ServiceFilter) {
        const services = Array.from(this.#device.services.values())
            .filter(service => matchServiceFilter(filter, service))
        services.forEach(service => activeRule?.watchServices.add(service.uniqueId))
        return new RuleServices(services, this.#controller)
    }

    isSet(type: string, handle: string) {
        const [service, key] = this.#property(type)
        if (!service)
            return false

        return this.#controller.constraints.isSet(service, key, handle)
    }

    unset(type: string, handle: string) {
        const [service, key] = this.#property(type)
        if (!service)
            return

        this.#controller.constraints.unset(service, key, handle)
    }

    set(type: string, value: any, handle?: string, priority?: number, options?: any): Promise<void> | void {
        const [service, key] = this.#property(type)
        if (!service)
            return

        if (handle !== undefined && priority !== undefined) {
            this.#controller.constraints.set(service, key, value, handle, priority, options)
            activeRule?.constraints.add(`${service.uniqueId}/${key}/${handle}`)
        } else
            return this.#controller.setValue(service, key, value).catch(e => console.error(e))
    }

    handle(type: string, handler: Handler) {
        const [service, key] = this.#property(type)
        if (!service)
            return

        this.#controller.handlers.add(service, key, handler)
        activeRule?.handlers.set(`${service.uniqueId}/${key}`, handler)
    }
}
