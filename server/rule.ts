import type Rules from "./rules"

export abstract class Rule {
    readonly rules: Rules
    watchServices: string[]
    watchDevices: string[]
    watchProperties: string[]

    constructor(rules: Rules) {
        this.rules = rules
        this.watchServices = []
        this.watchDevices = []
        this.watchProperties = []
    }

    abstract run(): void

    execute() {
        this.watchServices = []
        this.watchDevices = []
        this.watchProperties = []

        try {
            this.run()
        } catch (e) {
            console.error(e)
        }
    }
}
