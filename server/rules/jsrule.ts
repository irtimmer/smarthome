import fs from "fs";
import vm from "vm";

import type Rules from "../rules";
import { Rule } from "../rule";
import { Item, RuleDevice, RuleService, setActiveRule } from "./api";

export type JSRuleConfig = {
    script: string
    aliases: { [key: string]: string }
}

const itemProxyHandler: ProxyHandler<Item> = {
    get(target, prop, receiver) {
        if (target.has(prop.toString()))
            return target.get(prop.toString())
        else {
            const value = Reflect.get(target, prop, receiver)
            return typeof value == 'function' ? value.bind(target) : value;
        }
    },
    set(target, prop, value) {
        if (target.has(prop.toString())) {
            target.set(prop.toString(), value)
            return true
        }

        return Reflect.set(target, prop, value)
    }
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
        return vm.createContext(new Proxy({
            getService: (key: string) => {
                key = this.#config.aliases[key] ?? key

                this.watchServices.add(key)
                const service = this.rules.providers.services.get(key)
                return service ? new Proxy(new RuleService(service), itemProxyHandler) : null
            },
            getDevice: (key: string) => {
                key = this.#config.aliases[key] ?? key

                this.watchDevices.add(key)
                const device = this.rules.devices.devices.get(key)
                return device ? new Proxy(new RuleDevice(device), itemProxyHandler) : null
            }
        }, {
            get(target, prop, receiver) {
                if (prop == "Object")
                    return Object
                else if (target.hasOwnProperty(prop.toString())) {
                    const value = Reflect.get(target, prop, receiver)
                    return typeof value == 'function' ? value.bind(target) : value;
                } else
                    return target.getDevice(prop as string) ?? target.getService(prop as string)
            }
        }))
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
