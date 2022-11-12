import Provider from "../shared/provider";
import Service from "../shared/service";

import EventEmitter from "events";

export default class Providers extends EventEmitter {
    #providers: Map<string, Provider<Service>>

    constructor(config: { [key: string]: any }) {
        super()
        this.#providers = new Map
        for (const [key, providerConfig] of Object.entries(config)) {
            import(`../providers/${key}`).then((providerClass) => {
                this.registerProvider(new providerClass.default(key, providerConfig))
            })
        }
    }

    registerProvider(provider: Provider<Service>) {
        this.#providers.set(provider.id, provider)
        provider.on("register", (provider: Provider<Service>, service: Service) => {
            service.on("identifier", (service: Service, type: string, id: string) => {
                this.emit("identifier", provider, service, type, id)
            })
        })
    }

    get providers(): ReadonlyMap<string, Provider<Service>> {
        return this.#providers
    }
}
