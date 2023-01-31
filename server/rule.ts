import type Rules from "./rules"

export abstract class Rule {
    readonly rules: Rules
    watchServices: string[]
    watchProperties: string[]

    constructor(rules: Rules) {
        this.rules = rules
        this.watchServices = []
        this.watchProperties = []
    }

    abstract run(): void

    execute() {
        this.watchServices = []
        this.watchProperties = []

        try {
            this.run()
        } catch (e) {
            console.error(e)
        }
    }
}
