import { Service } from "../shared/service";
import type { Rule } from "./rule";
import JSRule, { JSRuleConfig } from "./rules/jsrule";
import Controller from "./controller";
import { matchServiceFilter } from "./filters";
import logging from "./logging";

import Provider from "../shared/provider";

export type RulesConfig = JSRuleConfig[]

export default class Rules extends Provider<Rule> {
    #scheduled: Rule[]
    #rules: Rule[]
    logger: ReturnType<typeof logging>
    controller: Controller

    constructor(controller: Controller, config: RulesConfig) {
        super(controller.providers.getHelper("rules"))
        this.logger = logging().child({ module: "rules" })
        this.controller = controller
        this.#rules = []
        this.#scheduled = []

        controller.providers.on("register", (service: Service) => {
            this.#scheduled.filter(r => r.watchServices.has(service.uniqueId) || r.watchServiceFilters.some(filter => matchServiceFilter(filter, service) ))
                .forEach(r => r.execute())
        })

        controller.providers.on("update", (service: Service, key: string) => {
            this.#scheduled.filter(r => r.watchProperties.has(`${service.uniqueId}/${key}`)).forEach(r => r.execute())
        })

        controller.providers.on("event", (service: Service, key: string, args: Record<string, any>) => {
            const ref = `${service.uniqueId}/${key}`;
            this.#scheduled.filter(r => r.watchServiceEvents.has(ref))
                .forEach(x => x.executeListener(ref, args))
        })

        controller.providers.on("identifier", (_: Service, type: string, id: string) => {
            const key = `${type}:${id}`
            this.#scheduled.filter(r => r.watchIdentifiers.has(key)).forEach(r => r.execute())
        })

        controller.devices.on("update", (key: string) => {
            this.#scheduled.filter(r => r.watchDevices.has(key)).forEach(r => r.execute())
        })

        this.setConfig(config)
    }

    scheduleRule(rule: Rule) {
        this.registerService(rule)
        this.#scheduled.push(rule)
    }

    unscheduleRule(rule: Rule) {
        this.unregisterService(rule)
        rule.unload()
        this.#scheduled.splice(this.#scheduled.indexOf(rule), 1)
    }

    get rules(): readonly Rule[] {
        return this.#rules
    }

    get scheduled(): readonly Rule[] {
        return this.#scheduled
    }

    setConfig(config: RulesConfig) {
        this.#rules.forEach(r => this.unscheduleRule(r))
        this.#rules = config.map(r => {
            const rule = new JSRule(r, this)
            this.scheduleRule(rule)
            rule.loading.then(() => {
                rule.execute()
            })
            return rule
        })
    }
}
