import fs from "fs";
import vm from "vm";

import type Rules from "../rules";
import { Rule } from "../rule";
import { Device } from "../devices";
import { Service } from "../../shared/service";

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

                this.watchServices.push(key)
                const service = this.rules.providers.services.get(key)
                return service ? new RuleService(this, service) : null
            },
            getDevice: (key: string) => {
                key = this.#config.aliases[key] ?? key

                this.watchDevices.push(key)
                const device = this.rules.devices.devices.get(key)
                return device ? new RuleDevice(this, device) : null
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

class RuleDevice {
    #rule: Rule
    #device: Device

    constructor(rule: Rule, device: Device) {
        this.#rule = rule
        this.#device = device
    }

    #property(type: string): [Service, string] | [null, null] {
        for (const service of this.#device.services)
            for (const [key, property] of service.properties)
                if (property['@type'] == type)
                    return [service, key]

        for (const service of this.#device.services)
            for (const [key, _] of service.properties)
                if (key == type)
                    return [service, key]

        return [null, null]
    }

    get(type: string): any {
        const [service, key] = this.#property(type)
        if (!service)
            return

        this.#rule.watchProperties.push(`${service.uniqueId}/${key}`)
        return service.values.get(key)
    }

    set(type: string, value: any, options?: any) {
        const [service, key] = this.#property(type)
        if (!service)
            return

        if (typeof options !== "undefined") {
            this.#rule.rules.constraints.set(service, key, value, options.priority, options.handle)
            this.#rule.constraints.push(`${service.uniqueId}/${key}/${options.handle}`)
        } else
            service.setValue(key, value).catch(e => console.error(e))
    }
}
