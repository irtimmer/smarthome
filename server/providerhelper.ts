type ProviderHelperConfig = {
    connections: Record<string, any>
}

export default class ProviderHelper {
    #connections: Map<string, Promise<any>> = new Map

    constructor(config: ProviderHelperConfig) {
        for (const [key, connectionConfig] of Object.entries(config.connections)) {
            this.#connections.set(key, import(`./connectors/${key}`).then((connectionClass) => {
                return new connectionClass.default(key, connectionConfig)
            }).catch(e => {
                console.error(`Can't load ${key}`, e)
            }))
        }
    }

    get connections(): ReadonlyMap<string, any> {
        return this.#connections
    }
}
