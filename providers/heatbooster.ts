import Provider, { ProviderManager } from "../shared/provider";
import Service from "../shared/service";
import Poll from "../shared/utils/poll";

import { HEATBOOSTER_PROPERTIES } from "./heatbooster_constants";

type HeatBoosterConfig = {
    url: string
}

export default class HeatBoosterProvider extends Provider<HeatBoosterService> {
    constructor(manager: ProviderManager, config: HeatBoosterConfig) {
        super(manager)

        const service = this.registerService(new HeatBoosterService(this, config))
        this.registerTask("poll", new Poll(async () => service.update(), {
            interval: 30
        }))
    }
}

class HeatBoosterService extends Service<HeatBoosterProvider> {
    #config: HeatBoosterConfig

    constructor(provider: HeatBoosterProvider, config: HeatBoosterConfig) {
        super(provider, provider.id)
        this.#config = config
        this.name = "HeatBooster"

        this.updateTypes(['temperatureSensor'])
        this.registerIdentifier('provider', provider.id)
        for (const [key, property] of Object.entries(HEATBOOSTER_PROPERTIES))
            this.registerProperty(key, {...{
                read_only: true
            }, ...property.defenition})
    }

    async update() {
        return fetch(`${this.#config.url}/getStatus`).then((data: any) => data.json()).then((data: any) => {
            this.registerIdentifier('ip', data.WIFI_TEST_IP)
            for (const [key, property] of Object.entries(HEATBOOSTER_PROPERTIES))
                this.updateValue(key, property.parse(data))
        })
    }
}
