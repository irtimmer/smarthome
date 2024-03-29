import Storage from "./storage";

import Provider from "../shared/provider";
import { Service } from "../shared/service";

import EventEmitter from "events";

export default class Providers extends EventEmitter {
    #providers: Map<string, Provider<Service>>
    #services: Map<string, Service>

    constructor(config: { [key: string]: any }) {
        super()
        this.#services = new Map
        this.#providers = new Map

        setImmediate(() => {
            for (const [key, providerConfig] of Object.entries(config)) {
                import(`../providers/${key}.js`).then((providerClass) => {
                    const storage = new Storage(key)
                    this.registerProvider(new providerClass.default(key, providerConfig, storage))
                }).catch(e => {
                    console.error(`Can't load ${key}`, e)
                })
            }
        })
    }

    registerProvider(provider: Provider<Service>) {
        this.#providers.set(provider.id, provider)
        provider.on("register", (service: Service) => {
            this.#services.set(service.uniqueId, service)
            this.emit("register", service)
            service.on("identifier", (type: string, id: string) => {
                this.emit("identifier", service, type, id)
            })
            service.on("update", (key: string, value: any, oldValue: any) => {
                this.emit("update", service, key, value, oldValue)
            })
            service.on("event", (key: string, args: Record<string, any>) => {
                this.emit("event", service, key, args)
            })

            service.identifiers.forEach(id => service.emit("identifier", ...id.split(':')))
            service.values.forEach((value, key) => service.emit("update", key, value, undefined))
        })

        provider.on("unregister", (service: Service) => {
            this.emit("unregister", service)
            this.#services.delete(service.uniqueId)
        })

        provider.services.forEach(service => provider.emit("register", service))
    }

    get providers(): ReadonlyMap<string, Provider<Service>> {
        return this.#providers
    }

    get services(): ReadonlyMap<string, Service> {
        return this.#services
    }
}
