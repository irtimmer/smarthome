import type Rules from "./rules"

export abstract class Rule {
    readonly rules: Rules
    abstract readonly loading: Promise<void>
    watchServices: Set<string>
    watchDevices: Set<string>
    watchProperties: Set<string>
    constraints: string[]
    subRules: Rule[]
    listeners: Map<String, (args: Record<string, any>) => void>

    constructor(rules: Rules) {
        this.rules = rules
        this.watchServices = new Set()
        this.watchDevices = new Set()
        this.watchProperties = new Set()
        this.subRules = []
        this.constraints = []
        this.listeners = new Map
    }

    abstract run(): void

    unload() {
        for (let constraint of this.constraints) {
            const [id, key, handle] = constraint.split('/')
            this.rules.constraints.unset(this.rules.providers.services.get(id)!, key, handle)
        }

        this.subRules.forEach(r => this.rules.unscheduleRule(r))
    }

    execute() {
        this.watchServices = new Set()
        this.watchDevices = new Set()
        this.watchProperties = new Set()
        this.listeners = new Map

        let currentConstraints = this.constraints
        this.constraints = []

        this.subRules.forEach(r => this.rules.unscheduleRule(r))
        this.subRules = []

        try {
            this.run()
        } catch (e) {
            console.error(e)
        } finally {
            this.rules.constraints.update()
            for (let constraint of currentConstraints) {
                if (!this.constraints.includes(constraint))
                    continue

                const [id, key, handle] = constraint.split('/')
                this.rules.constraints.unset(this.rules.providers.services.get(id)!, key, handle)
            }
        }
    }
}
