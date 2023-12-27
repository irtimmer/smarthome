import { v1 as uuidv1 } from 'uuid';

import Controller from "./controller"
import { Handler } from "./handlers"
import type Rules from "./rules"

export abstract class Rule {
    readonly id: string
    readonly rules: Rules
    readonly controller: Controller
    abstract readonly loading: Promise<void>
    watchServices: Set<string>
    watchDevices: Set<string>
    watchProperties: Set<string>
    constraints: Set<string>
    subRules: Rule[]
    listeners: Map<String, (args: Record<string, any>) => void>
    handlers: Map<string, Handler>

    #closed: boolean

    constructor(rules: Rules) {
        this.id = uuidv1()
        this.rules = rules
        this.controller = rules.controller
        this.watchServices = new Set()
        this.watchDevices = new Set()
        this.watchProperties = new Set()
        this.subRules = []
        this.constraints = new Set()
        this.listeners = new Map
        this.handlers = new Map

        this.#closed = false
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

        this.subRules.forEach(r => this.rules.unscheduleRule(r))
    }

    executeListener(id: string, args: Record<string, any>) {
        const listener = this.listeners.get(id)

        try {
            listener!(args)
        } catch (e) {
            console.error(e)
        } finally {
            this.controller.constraints.update()
        }
    }

    execute() {
        this.watchServices.clear()
        this.watchDevices.clear()
        this.watchProperties.clear()
        this.listeners.clear()

        for (const [path, handler] of this.handlers.entries()) {
            const [id, key] = path.split('/')
            this.controller.handlers.remove(this.controller.providers.services.get(id)!, key, handler)
        }
        this.handlers.clear()

        let currentConstraints = this.constraints
        this.constraints = new Set()

        this.subRules.forEach(r => this.rules.unscheduleRule(r))
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
}
