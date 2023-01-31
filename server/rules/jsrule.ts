import fs from "fs";
import vm from "vm";

import type Rules from "../rules";
import { Rule } from "../rule";
import { Service } from "../../shared/service";

export type JSRuleConfig = {
    script: string
}

export default class JSRule extends Rule {
    #script?: vm.Script
    #context: vm.Context

    constructor(config: JSRuleConfig, rules: Rules) {
        super(rules)
        fs.promises.readFile(config.script, {
            encoding: 'utf-8'
        }).then(data => {
            this.#script = new vm.Script(data)
        }).catch(e => console.error(e))
        this.#context = vm.createContext({
            getService: (key: string) => {
                this.watchServices.push(key)
                const service = rules.providers.services.get(key)
                return service ? new RuleService(this, service) : null
            }
        })
    }

    run() {
        this.#script?.runInContext(this.#context)
    }
}

export class RuleService {
    #rule: Rule
    #service: Service

    constructor(rule: Rule, service: Service) {
        this.#rule = rule
        this.#service = service
    }

    get(key: string): any {
        this.#rule.watchProperties.push(`${this.#service.uniqueId}/${key}`)
        return this.#service.values.get(key)
    }

    set(key: string, value: any) {
        this.#service.setValue(key, value).catch(e => console.error(e))
    }
}
