import { v1 as uuidv1 } from 'uuid';

import Controller from "./controller"
import { ServiceFilter } from "./filters"
import { Handler } from "./handlers"
import type Rules from "./rules"

import Service from "../shared/service"

export abstract class Rule extends Service<Rules> {
    readonly controller: Controller
    abstract readonly loading: Promise<void>
    watchServiceEvents: Map<String, (args: Record<string, any>) => void>
    watchServiceFilters: ServiceFilter[]
    watchServices: Set<string>
    watchDevices: Set<string>
    watchProperties: Set<string>
    constraints: Set<string>
    subRules: Rule[]
    handlers: Map<string, Handler>

    #closed: boolean

    constructor(rules: Rules) {
        super(rules, uuidv1())
        this.controller = rules.controller
        this.watchServiceEvents = new Map
        this.watchServiceFilters = []
        this.watchServices = new Set()
        this.watchDevices = new Set()
        this.watchProperties = new Set()
        this.subRules = []
        this.constraints = new Set()
        this.handlers = new Map

        this.#closed = false

        this.registerIdentifier('uuid', this.id)
        this.registerType("rule")

        this.name = "Rule"

        this.registerProperty("enabled", {
            label: "Enabled",
            read_only: false,
            type: "boolean"
        }, true)
    }

    abstract run(): void

    unload() {
        this.#closed = true

        for (let constraint of this.constraints) {
            const [id, key, handle] = constraint.split('/')
            this.controller.constraints.unset(this.controller.providers.services.get(id)!, key, handle)
        }

        for (const [path, handler] of this.handlers.entries()) {
            const [id, key] = path.split('/')
            this.controller.handlers.remove(this.controller.providers.services.get(id)!, key, handler)
        }

        this.subRules.forEach(r => this.provider.unscheduleRule(r))
    }

    executeListener(id: string, args: Record<string, any>) {
        const listener = this.watchServiceEvents.get(id)

        try {
            listener!(args)
        } catch (e) {
            console.error(e)
        } finally {
            this.controller.constraints.update()
        }
    }

    execute() {
        if (!this.values.get('enabled'))
            return

        this.watchServiceEvents.clear()
        this.watchServiceFilters = []
        this.watchServices.clear()
        this.watchDevices.clear()
        this.watchProperties.clear()

        for (const [path, handler] of this.handlers.entries()) {
            const [id, key] = path.split('/')
            this.controller.handlers.remove(this.controller.providers.services.get(id)!, key, handler)
        }
        this.handlers.clear()

        let currentConstraints = this.constraints
        this.constraints = new Set()

        this.subRules.forEach(r => this.provider.unscheduleRule(r))
        this.subRules = []

        try {
            this.run()
        } catch (e) {
            console.error(e)
        } finally {
            if (this.#closed) {
                this.unload()
                return
            }

            for (let constraint of currentConstraints) {
                if (this.constraints.has(constraint))
                    continue

                const [id, key, handle] = constraint.split('/')
                this.controller.constraints.unset(this.controller.providers.services.get(id)!, key, handle)
            }

            this.controller.constraints.update()
        }
    }

    setValue(key: string, value: any): Promise<void> {
        if (key == 'enabled') {
            this.updateValue(key, value)
            this.subRules.forEach(r => r.setValue(key, value))
            return Promise.resolve()
        } else
            return Promise.reject()
    }
}
