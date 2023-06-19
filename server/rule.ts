import Controller from "./controller"
import type Rules from "./rules"

export abstract class Rule {
    readonly rules: Rules
    readonly controller: Controller
    abstract readonly loading: Promise<void>
    watchServices: Set<string>
    watchDevices: Set<string>
    watchProperties: Set<string>
    constraints: Set<string>
    subRules: Rule[]
    listeners: Map<String, (args: Record<string, any>) => void>

    #closed: boolean

    constructor(rules: Rules) {
        this.rules = rules
        this.controller = rules.controller
        this.watchServices = new Set()
        this.watchDevices = new Set()
        this.watchProperties = new Set()
        this.subRules = []
        this.constraints = new Set()
        this.listeners = new Map

        this.#closed = false
    }

    abstract run(): void

    unload() {
        this.#closed = true

        for (let constraint of this.constraints) {
            const [id, key, handle] = constraint.split('/')
            this.controller.constraints.unset(this.controller.providers.services.get(id)!, key, handle)
        }

        this.subRules.forEach(r => this.rules.unscheduleRule(r))
    }

    execute() {
        this.watchServices.clear()
        this.watchDevices.clear()
        this.watchProperties.clear()
        this.listeners.clear()

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
