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
        for (const [key, providerConfig] of Object.entries(config)) {
            import(`../providers/${key}`).then((providerClass) => {
                this.registerProvider(new providerClass.default(key, providerConfig))
            })
        }
    }

    registerProvider(provider: Provider<Service>) {
        this.#providers.set(provider.id, provider)
        provider.on("register", (service: Service) => {
            this.#services.set(service.uniqueId, service)
            service.on("identifier", (type: string, id: string) => {
                this.emit("identifier", service, type, id)
            })
            service.on("update", (key: string, value: any, oldValue: any) => {
                this.emit("update", service, key, value, oldValue)
            })
        })
    }

    get providers(): ReadonlyMap<string, Provider<Service>> {
        return this.#providers
    }

    get services(): ReadonlyMap<string, Service> {
        return this.#services
    }
}
