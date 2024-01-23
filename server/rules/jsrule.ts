import fs from "fs";
import vm from "vm";

import type Rules from "../rules";
import { Rule } from "../rule";
import { Action } from "../constraints";
import { NullItem, RuleDevice, RuleService, itemProxyHandler, setActiveRule } from "./api";

export type JSRuleConfig = {
    script: string
    aliases: { [key: string]: string }
    config?: any
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

        this.registerProperty("file", {
            label: "Filename",
            read_only: true,
            type: "string"
        }, this.scriptFile)
    }

    unload() {
        super.unload()
        this.#watcher.close()
    }

    get #context() {
        return vm.createContext(new Proxy({
            Action,
            config: this.#config.config,
            console,
            at: (time: string, fn: () => void) => {
                const [hour, minute] = time.split(":").map(v => parseInt(v))
                const date = new Date()
                date.setHours(hour, minute)
                if (date < new Date())
                    date.setDate(date.getDate() + 1)

                this.watchTimeEvents.push(setTimeout(fn, date.getTime() - Date.now()))
            },
            between: (start: string, end: string) => {
                const [startHour, startMinute] = start.split(":").map(v => parseInt(v))
                const [endHour, endMinute] = end.split(":").map(v => parseInt(v))
                const date = new Date()

                const now = date.getTime()
                let startTime = date.setHours(startHour, startMinute)
                let endTime = date.setHours(endHour, endMinute)

                // If the end time is before the start time, the end time must be tomorrow
                if (endTime < startTime)
                    endTime = date.setDate(date.getDate() + 1)

                // If the end time is before now, the start time must be tomorrow
                if (now > endTime)
                    startTime += 24 * 60 * 60 * 1000

                const ret = now >= startTime && now <= endTime
                const nextRun = ret ? endTime : startTime
                if (!this.nextRun || nextRun < this.nextRun)
                    this.nextRun = nextRun

                return ret
            },
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
                const subRule = new SubRule(fn, this)
                this.subRules.push(subRule)
                this.provider.scheduleRule(subRule)
                setImmediate(subRule.execute.bind(subRule))
            },
            registerIdentifier: (type: string, id: string) => {
                if (!this.identifiers.has(`${type}:${id}`))
                    this.registerIdentifier(type, id)
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
        try {
            this.#script?.runInContext(this.#context)
        } catch (e: any) {
            console.error(e?.message ?? e)
        }
        setActiveRule(undefined)
    }
}

class SubRule extends Rule {
    #fn: () => void

    constructor(fn: () => void, rule: Rule) {
        super(rule.provider)
        this.#fn = fn

        // Mark the subrule as part of the parent rule
        this.registerIdentifier("uuid", rule.id)
    }

    get loading(): Promise<void> {
        return Promise.resolve()
    }

    run(): void {
        setActiveRule(this)
        try {
            this.#fn()
        } catch (e: any) {
            console.error(e?.message ?? e)
        }
        setActiveRule(undefined)
    }
}
