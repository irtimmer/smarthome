import Provider from "../shared/provider";
import Service from "../shared/service";

export default class Providers {
    #providers: Map<string, Provider<Service>>

    constructor(config: { [key: string]: any }) {
        this.#providers = new Map
        for (const [key, providerConfig] of Object.entries(config)) {
            import(`../providers/${key}`).then((providerClass) => {
                this.registerProvider(new providerClass.default(key, providerConfig))
            })
        }
    }

    registerProvider(provider: Provider<Service>) {
        this.#providers.set(provider.id, provider)
    }

    get providers(): ReadonlyMap<string, Provider<Service>> {
        return this.#providers
    }
}
