import Connectors from "./connectors";
import ProviderHelper from "./providerhelper";
import logging from "./logging";

import Provider from "../shared/provider";
import { Service } from "../shared/service";

import EventEmitter from "events";

export default class Providers extends EventEmitter {
    #connectors: Connectors
    #providers: Map<string, Provider<Service>>
    #services: Map<string, Service>
    #logger: ReturnType<typeof logging>

    constructor(config: { [key: string]: any }, connectors: Connectors) {
        super()
        this.#connectors = connectors
        this.#services = new Map
        this.#providers = new Map
        this.#logger = logging().child({ module: "providers" })

        setImmediate(() => {
            for (const [key, providerConfig] of Object.entries(config)) {
                const provider = providerConfig && providerConfig.provider || key
                import(`../providers/${provider}.js`).then((providerClass) => {
                    this.registerProvider(new providerClass.default(this.getHelper(key), providerConfig))
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
            service.on("registerIdentifier", (type: string, id: string) => {
                this.emit("registerIdentifier", service, type, id)
            })
            service.on("update", (key: string, value: any, oldValue: any) => {
                this.emit("update", service, key, value, oldValue)
            })
            service.on("event", (key: string, args: Record<string, any>) => {
                this.emit("event", service, key, args)
            })

            service.identifiers.forEach(id => service.emit("registerIdentifier", ...id.split(':')))
            service.values.forEach((value, key) => service.emit("update", key, value, undefined))
        })

        provider.on("unregister", (service: Service) => {
            this.emit("unregister", service)
            this.#services.delete(service.uniqueId)
        })

        provider.services.forEach(service => provider.emit("register", service))
    }

    getHelper(id: string): ProviderHelper {
        return new ProviderHelper(id, this.#connectors)
    }

    get providers(): ReadonlyMap<string, Provider<Service>> {
        return this.#providers
    }

    get services(): ReadonlyMap<string, Service> {
        return this.#services
    }
}
