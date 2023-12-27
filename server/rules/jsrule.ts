import fs from "fs";
import vm from "vm";

import type Rules from "../rules";
import { Rule } from "../rule";
import { Action } from "../constraints";
import { Item, NullItem, RuleDevice, RuleService, setActiveRule } from "./api";

export type JSRuleConfig = {
    script: string
    aliases: { [key: string]: string }
    config?: any
}

const itemProxyHandler: ProxyHandler<Item> = {
    get(target, prop, receiver) {
        if (target.has(prop.toString()))
            return target.get(prop.toString())
        else {
            const value = Reflect.get(target, prop, receiver)
            return typeof value == 'function' ? (...args: any[]) => {
                const ret = value.bind(target)(...args)
                return ret instanceof Item ? new Proxy(ret, itemProxyHandler) : ret
            } : value;
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
    readonly scriptFile
    #script?: vm.Script
    #loading: Promise<any>
    #config: JSRuleConfig
    readonly #watcher: fs.FSWatcher

    constructor(config: JSRuleConfig, rules: Rules) {
        super(rules)
        this.#config = config
        this.scriptFile = config.script

        this.#loading = this.#load()
        this.#watcher = fs.watch(this.scriptFile, event => {
            if (event != "change")
                return

            this.#loading = this.#load()
            this.#loading.then(_ => this.execute())
        });
    }

    unload() {
        super.unload()
        this.#watcher.close()
    }

    get #context() {
        return vm.createContext(new Proxy({
            Action,
            config: this.#config.config,
            getService: (key: string) => {
                key = this.#config.aliases[key] ?? key

                this.watchServices.add(key)
                const service = this.controller.providers.services.get(key)
                return service ? new Proxy(new RuleService(service, this.controller), itemProxyHandler) : null
            },
            getDevice: (key: string) => {
                key = this.#config.aliases[key] ?? key

                this.watchDevices.add(key)
                const device = this.controller.devices.devices.get(key)
                return device ? new Proxy(new RuleDevice(device, this.controller), itemProxyHandler) : null
            },
            watch: (fn: () => void) => {
                const subRule = new SubRule(fn, this.rules)
                this.subRules.push(subRule)
                this.rules.scheduleRule(subRule)
                setImmediate(subRule.execute.bind(subRule))
            }
        }, {
            get(target, prop, receiver) {
                if (prop == "Object")
                    return Object
                else if (target.hasOwnProperty(prop.toString())) {
                    const value = Reflect.get(target, prop, receiver)
                    return typeof value == 'function' ? value.bind(target) : value;
                } else
                    return target.getDevice(prop as string) ?? target.getService(prop as string) ?? new Proxy(new NullItem(), itemProxyHandler)
            }
        }))
    }

    #load() : Promise<void> {
        return fs.promises.readFile(this.scriptFile, {
            encoding: 'utf-8'
        }).then(data => {
            this.#script = new vm.Script(data, {
                filename: this.scriptFile
            })
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

class SubRule extends Rule {
    #fn: () => void

    constructor(fn: () => void, rules: Rules) {
        super(rules)
        this.#fn = fn
    }

    get loading(): Promise<void> {
        return Promise.resolve()
    }

    run(): void {
        setActiveRule(this)
        this.#fn()
        setActiveRule(undefined)
    }
}
