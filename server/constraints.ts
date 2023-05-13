import { Service } from "../shared/service"
import Providers from "./providers"

type Constraint = {
    priority: number,
    handle: string,
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

    set(service: Service, key: string, value: any, handle: string, priority: number) {
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

        const options = {
            value,
            handle,
            priority
        }

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
            return constraint.value
        }, undefined as unknown)
    }

    get constraints(): ReadonlyMap<Service, ReadonlyMap<string, Constraint[]>> {
        return this.#constraints
    }
}
