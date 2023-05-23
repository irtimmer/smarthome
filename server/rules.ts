import { Service } from "../shared/service";
import Constraints from "./constraints";
import type { Rule } from "./rule";
import JSRule, { JSRuleConfig } from "./rules/jsrule";
import Providers from "./providers";
import Devices from "./devices";

type Config = JSRuleConfig[]

export default class Rules {
    #scheduled: Rule[]
    #rules: Rule[]
    providers: Providers
    devices: Devices
    constraints: Constraints

    constructor(config: Config, providers: Providers, devices: Devices, constraints: Constraints) {
        this.#rules = []
        this.#scheduled = []
        this.providers = providers
        this.devices = devices
        this.constraints = constraints

        providers.on("register", (service: Service) => {
            this.#scheduled.filter(r => r.watchServices.has(service.uniqueId)).forEach(r => r.execute())
        })

        providers.on("update", (service: Service, key: string) => {
            this.#scheduled.filter(r => r.watchProperties.has(`${service.uniqueId}/${key}`)).forEach(r => r.execute())
        })

        providers.on("event", (service: Service, key: string, args: Record<string, any>) => {
            this.#scheduled.map(r => r.listeners.get(`${service.uniqueId}/${key}`)).filter(x => x).forEach(x => {
                try {
                    x!(args)
                } catch (e) {
                    console.error(e)
                }
            })
        })

        devices.on("update", (key: string) => {
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

    setConfig(config: Config) {
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
