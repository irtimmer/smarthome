import ProviderHelper from "./providerhelper";
import Storage from "./storage";

import Provider from "../shared/provider";
import { Service } from "../shared/service";
import logging from "../shared/logging";

import EventEmitter from "events";

export default class Providers extends EventEmitter {
    #providers: Map<string, Provider<Service>>
    #services: Map<string, Service>
    #logger: ReturnType<typeof logging>

    constructor(config: { [key: string]: any }, helper: ProviderHelper) {
        super()
        this.#services = new Map
        this.#providers = new Map
        this.#logger = logging().child({ module: "providers" })

        setImmediate(() => {
            for (const [key, providerConfig] of Object.entries(config)) {
                import(`../providers/${key}.js`).then((providerClass) => {
                    const storage = new Storage(key)
                    this.registerProvider(new providerClass.default(key, providerConfig, storage, helper))
                }).catch((e: any) => {
                    this.#logger.error({ module: key }, "Can't load provider: %s", e.message)
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
