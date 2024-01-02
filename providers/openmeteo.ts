import Provider from "../shared/provider";
import Service from "../shared/service";
import Poll from "../shared/utils/poll";

import { OPENMETEO_PROPERTIES } from "./openmeteo_constants";

const BASE_URL = "https://api.open-meteo.com/v1"

type OpenMeteoConfig = {
    latitude: number,
    longitude: number
}

export default class OpenMeteoProvider extends Provider<OpenMeteoService> {
    constructor(id: string, config: OpenMeteoConfig) {
        super(id)

        const weather = this.registerService(new OpenMeteoService(this, config))

        new Poll(async () => weather.update(), {
            interval: 5 * 60 * 1000
        })
    }
}

class OpenMeteoService extends Service<OpenMeteoProvider> {
    #config: OpenMeteoConfig

    constructor(provider: OpenMeteoProvider, config: OpenMeteoConfig) {
        super(provider, provider.id)
        this.#config = config
        this.name = "Weather"

        this.updateTypes(['weather', 'temperatureSensor'])
        this.registerIdentifier('provider', provider.id)
        for (const [key, property] of Object.entries(OPENMETEO_PROPERTIES))
            this.registerProperty(key, {...{
                read_only: true
            }, ...property.defenition})
    }

    async update() {
        const params = new URLSearchParams({
            latitude: this.#config.latitude.toString(),
            longitude: this.#config.longitude.toString(),
            current_weather: true.toString()
        });
        const url = `${BASE_URL}/forecast?${params.toString()}`
        return fetch(url).then((data: any) => data.json()).then((data: any) => {
            for (const [key, property] of Object.entries(OPENMETEO_PROPERTIES))
                this.updateValue(key, property.parse(data))
        })
    }
}
