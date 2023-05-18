import { Service } from "../shared/service"
import Providers from "./providers"

enum Action {
    MINIMUM,
    MAXIMUM,
    ADDITION,
    MULTIPLY
}

type Constraint = {
    priority: number,
    handle: string,
    action?: Action,
    value: any
}

export default class Constraints {
    #constraints: Map<Service, Map<string, Constraint[]>>
    readonly providers: Providers

    constructor(providers: Providers) {
        this.providers = providers
        this.#constraints = new Map

        providers.on("update", (service: Service, key: string) => {
            this.#solveAndSet(service, key)
        })
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
        if (index >= 0)
            propertyConstraints[index] = options
        else {
            index = propertyConstraints.findIndex((x => x.priority > priority))

            if (index >= 0)
                propertyConstraints.splice(index, 0, options)
            else
                propertyConstraints.push(options)
        }

        service.setValue(key, this.#solve(propertyConstraints)).catch(e => console.error(e))
    }

    unset(service: Service, key: string, handle: string) {
        let constraints = this.#constraints.get(service)?.get(key)
        if (!constraints)
            return

        const index = constraints.findIndex((x: any) => x.handle == handle)
        if (index < 0)
            return

        constraints.splice(index, 1)
        service.setValue(key, this.#solve(constraints)).catch(e => console.error(e))
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
