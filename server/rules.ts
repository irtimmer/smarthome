import { Service } from "../shared/service";
import Constraints from "./constraints";
import type { Rule } from "./rule";
import JSRule, { JSRuleConfig } from "./rules/jsrule";
import Providers from "./providers";
import Devices from "./devices";

type Config = JSRuleConfig[]

export default class Rules {
    #rules: Rule[]
    providers: Providers
    devices: Devices
    constraints: Constraints

    constructor(config: Config, providers: Providers, devices: Devices, constraints: Constraints) {
        this.#rules = []
        this.providers = providers
        this.devices = devices
        this.constraints = constraints

        providers.on("register", (service: Service) => {
            this.#rules.filter(r => r.watchServices.includes(service.uniqueId)).forEach(r => r.execute())
        })

        providers.on("update", (service: Service, key: string) => {
            this.#rules.filter(r => r.watchProperties.includes(`${service.uniqueId}/${key}`)).forEach(r => r.execute())
        })

        devices.on("update", (key: string) => {
            this.#rules.filter(r => r.watchDevices.includes(key)).forEach(r => r.execute())
        })

        this.setConfig(config)
    }

    setConfig(config: Config) {
        this.#rules.forEach(r => r.unload())
        this.#rules = config.map(r => {
            const rule = new JSRule(r, this)
            rule.loading.then(() => rule.execute())
            return rule
        })
    }
}
