import fs from "fs";
import vm from "vm";

import type Rules from "../rules";
import { Rule } from "../rule";
import { RuleDevice, RuleService, setActiveRule } from "./api";

export type JSRuleConfig = {
    script: string
    aliases: { [key: string]: string }
}

export default class JSRule extends Rule {
    readonly #scriptFile
    #script?: vm.Script
    #loading: Promise<any>
    #config: JSRuleConfig

    constructor(config: JSRuleConfig, rules: Rules) {
        super(rules)
        this.#config = config
        this.#scriptFile = config.script

        this.#loading = this.#load()
        fs.watch(this.#scriptFile, (_, filename) => {
            if (!filename)
                return

            this.#loading = this.#load()
            this.#loading.then(_ => this.execute())
        });
    }

    get #context() {
        return vm.createContext({
            getService: (key: string) => {
                key = this.#config.aliases[key] ?? key

                this.watchServices.add(key)
                const service = this.rules.providers.services.get(key)
                return service ? new RuleService(service) : null
            },
            getDevice: (key: string) => {
                key = this.#config.aliases[key] ?? key

                this.watchDevices.add(key)
                const device = this.rules.devices.devices.get(key)
                return device ? new RuleDevice(device) : null
            }
        })
    }

    #load() : Promise<void> {
        return fs.promises.readFile(this.#scriptFile, {
            encoding: 'utf-8'
        }).then(data => {
            this.#script = new vm.Script(data)
        }).catch(e => console.error(e))
    }

    get loading() : Promise<void> {
        return this.#loading
    }

    run() {
        setActiveRule(this)
        this.#script?.runInContext(this.#context)
        setActiveRule(undefined)
    }
}
