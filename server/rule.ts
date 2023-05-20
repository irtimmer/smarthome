import type Rules from "./rules"

export abstract class Rule {
    readonly rules: Rules
    abstract readonly loading: Promise<void>
    watchServices: string[]
    watchDevices: string[]
    watchProperties: string[]
    constraints: string[]

    constructor(rules: Rules) {
        this.rules = rules
        this.watchServices = []
        this.watchDevices = []
        this.watchProperties = []
        this.constraints = []
    }

    abstract run(): void

    unload() {
        for (let constraint of this.constraints) {
            const [id, key, handle] = constraint.split('/')
            this.rules.constraints.unset(this.rules.providers.services.get(id)!, key, handle)
        }
    }

    execute() {
        this.watchServices = []
        this.watchDevices = []
        this.watchProperties = []

        let currentConstraints = this.constraints
        this.constraints = []

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
