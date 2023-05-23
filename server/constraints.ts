import { Service } from "../shared/service"
import Providers from "./providers"

enum Action {
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

export default class Constraints {
    #constraints: Map<Service, Map<string, Constraint[]>>
    #modified: Map<Service, Set<string>>
    readonly providers: Providers

    constructor(providers: Providers) {
        this.providers = providers
        this.#constraints = new Map
        this.#modified = new Map

        providers.on("update", (service: Service, key: string) => {
            this.#solveAndSet(service, key)
        })
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
        for (const [service, keys] of this.#modified.entries())
            keys.forEach(key => this.#solveAndSet(service, key))

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
            propertyConstraints = []
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
            service.setValue(key, value).catch(e => console.error(e))
    }

    #solve(constraints: Constraint[]): any {
        return constraints.reduce((current, constraint) => {
            if (typeof current == 'undefined' || typeof constraint.action == 'undefined')
                return constraint.value

            switch(constraint.action) {
                case Action.MINIMUM:
                    return Math.max(current as number, constraint.value)
                case Action.MAXIMUM:
                    return Math.min(current as number, constraint.value)
                case Action.ADDITION:
                    return current + constraint.value
                case Action.MULTIPLY:
                    return (current as number) * constraint.value
            }
        }, undefined as unknown)
    }

    get constraints(): ReadonlyMap<Service, ReadonlyMap<string, Constraint[]>> {
        return this.#constraints
    }
}
