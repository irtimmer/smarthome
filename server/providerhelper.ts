import logging from "../shared/logging";

type ProviderHelperConfig = {
    connections: Record<string, any>
}

export default class ProviderHelper {
    #connections: Map<string, Promise<any>> = new Map
    #logger: ReturnType<typeof logging>

    constructor(config: ProviderHelperConfig) {
        this.#logger = logging().child({ module: "providerhelper" })
        for (const [key, connectionConfig] of Object.entries(config.connections)) {
            this.#connections.set(key, import(`./connectors/${key}`).then((connectionClass) => {
                return new connectionClass.default(key, connectionConfig)
            }).catch(e => {
                this.#logger.error({ module: key }, "Can't load: %s", e.message)
            }))
        }
    }

    get connections(): ReadonlyMap<string, any> {
        return this.#connections
    }
}
