import { Service } from "../shared/service";
import type { Rule } from "./rule";
import JSRule, { JSRuleConfig } from "./rules/jsrule";
import Controller from "./controller";

export type RulesConfig = JSRuleConfig[]

export default class Rules {
    #scheduled: Rule[]
    #rules: Rule[]
    controller: Controller

    constructor(controller: Controller, config: RulesConfig) {
        this.controller = controller
        this.#rules = []
        this.#scheduled = []

        controller.providers.on("register", (service: Service) => {
            this.#scheduled.filter(r => r.watchServices.has(service.uniqueId)).forEach(r => r.execute())
        })

        controller.providers.on("update", (service: Service, key: string) => {
            this.#scheduled.filter(r => r.watchProperties.has(`${service.uniqueId}/${key}`)).forEach(r => r.execute())
        })

        controller.providers.on("event", (service: Service, key: string, args: Record<string, any>) => {
            this.#scheduled.map(r => r.listeners.get(`${service.uniqueId}/${key}`)).filter(x => x).forEach(x => {
                try {
                    x!(args)
                } catch (e) {
                    console.error(e)
                }
            })
        })

        controller.devices.on("update", (key: string) => {
            this.#scheduled.filter(r => r.watchDevices.has(key)).forEach(r => r.execute())
        })

        this.setConfig(config)
    }

    scheduleRule(rule: Rule) {
        this.#scheduled.push(rule)
    }

    unscheduleRule(rule: Rule) {
        rule.unload()
        this.#scheduled.splice(this.#scheduled.indexOf(rule), 1)
    }

    get rules(): readonly Rule[] {
        return this.#rules
    }

    setConfig(config: RulesConfig) {
        this.#rules.forEach(r => this.unscheduleRule(r))
        this.#rules = config.map(r => {
            const rule = new JSRule(r, this)
            rule.loading.then(() => {
                this.scheduleRule(rule)
                rule.execute()
            })
            return rule
        })
    }
}
