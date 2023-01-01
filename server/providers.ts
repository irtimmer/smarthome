import Provider from "../shared/provider";
import Service from "../shared/service";

import EventEmitter from "events";

export default class Providers extends EventEmitter {
    #providers: Map<string, Provider<any>>
    #services: Map<string, Service<any>>

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

    registerProvider(provider: Provider<any>) {
        this.#providers.set(provider.id, provider)
        provider.on("register", (service: Service<any>) => {
            this.#services.set(`${provider.id}:${service.id}`, service)
            service.on("identifier", (type: string, id: string) => {
                this.emit("identifier", service, type, id)
            })
            service.on("update", (key: string, value: any, oldValue: any) => {
                this.emit("update", service, key, value, oldValue)
            })
        })
    }

    get providers(): ReadonlyMap<string, Provider<any>> {
        return this.#providers
    }

    get services(): ReadonlyMap<string, Service<any>> {
        return this.#services
    }
}
