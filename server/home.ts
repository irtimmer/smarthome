import Provider from "../shared/provider";
import Service from "../shared/service";

import Controller from "./controller";
import { Rule } from "./rule";
import JSRule from "./rules/jsrule";

type HomeConfig = {
}

export default class Home extends Provider<Service<Home>> {
    readonly controller: Controller

    constructor(controller: Controller, config: HomeConfig) {
        super("home")
        this.controller = controller

        this.registerService(new HomeService(this))

        controller.rules.scheduled.forEach((rule: Rule) => this.registerService(new RuleService(this, rule)))
        controller.rules.on("register", (rule: Rule) => this.registerService(new RuleService(this, rule)))
        controller.rules.on("unregister", (rule: Rule) => {
            const service = this.services.get(rule.id)
            if (service)
                this.unregisterService(service)
        })
    }
}

class HomeService extends Service<Home> {
    constructor(provider: Home) {
        super(provider, 'home')
        this.registerIdentifier('provider', provider.id)
        this.registerType("home")

        this.name = "Home"
    }
}

class RuleService extends Service<Home> {
    #rule: Rule

    constructor(provider: Home, rule: Rule) {
        super(provider, rule.id)
        this.registerIdentifier('uuid', rule.id)
        this.registerType("rule")

        this.name = "Rule"
        this.#rule = rule;

        if (rule instanceof JSRule)
            this.registerProperty("file", {
                label: "Filename",
                read_only: true,
                type: "string"
            }, rule.scriptFile)
    }
}
