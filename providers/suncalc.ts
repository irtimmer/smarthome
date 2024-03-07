import Provider from "../shared/provider";
import Service from "../shared/service";

import SunCalc from "suncalc"

type SunCalcConfig = {
    latitude: number,
    longitude: number
}

export default class SunCalcProvider extends Provider<SunService> {
    constructor(id: string, config: SunCalcConfig) {
        super(id)
        setImmediate(() => {
            const sun = new SunService(this, id, config)
            this.registerService(sun)
            sun.registerIdentifier('provider', id)

            sun.update()
            setInterval(() => sun.update(), 60 * 1000)
        })
    }
}

class SunService extends Service<SunCalcProvider> {
    #config: SunCalcConfig

    constructor(provider: SunCalcProvider, id: string, config: SunCalcConfig) {
        super(provider, id)
        this.#config = config
        this.name = "Sun"

        this.registerType("sun")
        this.registerProperty('sunset', {
            type: 'number',
            logical_type: 'timestamp',
            label: 'Sunset',
            read_only: true
        })
        this.registerProperty('sunrise', {
            type: 'number',
            logical_type: 'timestamp',
            label: 'Sunrise',
            read_only: true
        })
        this.registerProperty('altitude', {
            type: 'number',
            label: 'Altitude',
            read_only: true
        })
    }

    update() {
        const date = new Date()
        const times = SunCalc.getTimes(date, this.#config.latitude, this.#config.longitude)
        this.updateValue('sunset', times.sunset.getTime() / 1000)
        this.updateValue('sunrise', times.sunrise.getTime() / 1000)

        const position = SunCalc.getPosition(date, this.#config.latitude, this.#config.longitude)
        this.updateValue('altitude', position.altitude)
    }
}
