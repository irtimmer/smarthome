import { Service } from "../shared/service";
import type { Rule } from "./rule";
import JSRule, { JSRuleConfig } from "./rules/jsrule";
import Providers from "./providers";

type Config = JSRuleConfig[]

export default class Rules {
    #rules: Rule[]
    providers: Providers

    constructor(config: Config, providers: Providers) {
        this.#rules = []
        this.providers = providers

        providers.on("register", (service: Service) => {
            this.#rules.filter(r => r.watchServices.includes(service.uniqueId)).forEach(r => r.execute())
        })

        providers.on("update", (service: Service, key: string) => {
            this.#rules.filter(r => r.watchProperties.includes(`${service.uniqueId}/${key}`)).forEach(r => r.execute())
        })

        config.forEach((r) => this.#rules.push(new JSRule(r, this)))
        setImmediate(() => this.#rules.forEach(r => r.execute()))
    }
}
