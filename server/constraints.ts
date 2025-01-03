import { Service } from "../shared/service"
import Controller from "./controller"

import EventEmitter from "events";

export enum Action {
    BASE,
    MINIMUM,
    MAXIMUM,
    ADDITION,
    MULTIPLY
}

export type Constraint = {
    priority: number,
    handle: string,
    action?: Action,
    keep?: number,
    timer?: NodeJS.Timeout,
    value: any
}

const NEEDS_RESET = Symbol('RESET')
const UP_TO_DATE = Symbol('UPTODATE')

export default class Constraints extends EventEmitter {
    #constraints: Map<Service, Map<string, Constraint[]>>
    #modified: Map<Service, Set<string>>
    readonly controller: Controller

    constructor(controller: Controller) {
        super()
        this.controller = controller
        this.#constraints = new Map
        this.#modified = new Map

        controller.providers.on("update", this.#updateValue.bind(this))
    }

    #markModified(service: Service, key: string) {
        let modifiedProperties = this.#modified.get(service)
        if (!modifiedProperties) {
            modifiedProperties = new Set
            this.#modified.set(service, modifiedProperties)
        }

        modifiedProperties.add(key)
    }

    update() {
        for (const [service, keys] of this.#modified.entries()) {
            keys.forEach(key => {
                this.#solveAndSet(service, key)
                this.emit("update", service, key, this.#constraints.get(service)?.get(key))
            })
        }

        this.#modified.clear()
    }

    set(service: Service, key: string, value: any, handle: string, priority: number, opts: any | undefined) {
        let serviceConstraints = this.#constraints.get(service)
        if (!serviceConstraints) {
            serviceConstraints = new Map
            this.#constraints.set(service, serviceConstraints)
        }

        let propertyConstraints = serviceConstraints.get(key)
        if (!propertyConstraints) {
            propertyConstraints = [{
                handle: "_BASE",
                priority: -1,
                action: Action.BASE,
                value: service.values.get(key)
            }]
            serviceConstraints.set(key, propertyConstraints)
        }

        const options = {...opts, ...{
            value,
            handle,
            priority
        }}

        let index = propertyConstraints.findIndex(x => x.handle == handle)
        if (index >= 0) {
            const constraint = propertyConstraints[index]
            if (constraint.timer)
                clearTimeout(constraint.timer)

            const oldOptions = propertyConstraints[index]
            propertyConstraints[index] = options

            //Do not mark as modified if no influence on solved value
            if (oldOptions.value == options.value && oldOptions.action == options.action)
                return
        } else {
            index = propertyConstraints.findIndex((x => x.priority > priority))

            if (index >= 0)
                propertyConstraints.splice(index, 0, options)
            else
                propertyConstraints.push(options)
        }

        this.#markModified(service, key)
    }

    isSet(service: Service, key: string, handle: string) {
        return Boolean(this.#constraints.get(service)?.get(key)?.some(c => c.handle == handle))
    }

    unset(service: Service, key: string, handle: string) {
        let constraints = this.#constraints.get(service)?.get(key)
        if (!constraints)
            return

        const index = constraints.findIndex((x: any) => x.handle == handle)
        if (index < 0)
            return

        const constraint = constraints[index]

        if (constraint.timer)
            clearTimeout(constraint.timer)

        if (constraint.keep) {
            constraint.timer = setTimeout(() => this.unset(service, key, handle), constraint.keep)
            delete constraint.keep
            return
        }

        constraints.splice(index, 1)
        this.#markModified(service, key)
    }

    #solveAndSet(service: Service, key: string) {
        const constraints = this.#constraints.get(service)?.get(key)
        if (!constraints)
            return

        const value = this.#solve(constraints)
        if (typeof value != 'undefined' && service.values.get(key) != value)
            this.controller.setConstrainedValue(service, key, value).catch(e => console.error(e))
    }

    #constrainValueAction(service: Service, key: string, value: any, constraints: Constraint[]): any {
        return constraints.reduceRight((current, constraint) => {
            if (current == NEEDS_RESET || current == UP_TO_DATE)
                return current

            switch(constraint.action) {
                case Action.BASE:
                    constraint.value = current
                    return UP_TO_DATE
                case Action.MINIMUM:
                    return current < constraint.value ? NEEDS_RESET : current
                case Action.MAXIMUM:
                    return current > constraint.value ? NEEDS_RESET : current
                case Action.ADDITION:
                    return current - constraint.value
                case Action.MULTIPLY:
                    return (current as number) / constraint.value
                default:
                    return current == constraint.value ? UP_TO_DATE : NEEDS_RESET
            }
        }, value)
    }

    constrainValue(service: Service, key: string, value: any) {
        const constraints = this.#constraints.get(service)?.get(key)
        if (!constraints)
            return value

        const action = this.#constrainValueAction(service, key, value, constraints)
        if (action == NEEDS_RESET)
            return this.#solve(constraints)
        else if (action == UP_TO_DATE)
            return value
        else
            return action
    }

    #updateValue(service: Service, key: string, value: any) {
        const constraints = this.#constraints.get(service)?.get(key)
        if (!constraints)
            return

        const action = this.#constrainValueAction(service, key, value, constraints)
        if (action == NEEDS_RESET) {
            const value = this.#solve(constraints)
            service.setValue(key, value).catch(e => console.error(e))
        }
    }

    #solve(constraints: Constraint[]): any {
        return constraints.reduce((current, constraint) => {
            switch(constraint.action) {
                case Action.MINIMUM:
                    return Math.max(current as number, constraint.value)
                case Action.MAXIMUM:
                    return Math.min(current as number, constraint.value)
                case Action.ADDITION:
                    return current + constraint.value
                case Action.MULTIPLY:
                    return (current as number) * constraint.value
                default:
                    return constraint.value
            }
        }, undefined as unknown)
    }

    get constraints(): ReadonlyMap<Service, ReadonlyMap<string, Constraint[]>> {
        return this.#constraints
    }
}
