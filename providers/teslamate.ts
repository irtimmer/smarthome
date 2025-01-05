import Mqtt from "../server/connectors/mqtt";

import Provider, { ProviderManager } from "../shared/provider";
import Service from "../shared/service";

import { TESLAMATE_PROPERTIES } from "./teslamate_constants";

type TeslaMateConfig = {
}

export default class TeslaMate extends Provider<Car> {
    constructor(manager: ProviderManager, _config: TeslaMateConfig) {
        super(manager)

        let mqtt = manager.getConnection("mqtt")
        if (!mqtt)
            throw new Error("No MQTT connection")

        mqtt.then((mqtt: any) => {
            if (!(mqtt instanceof Mqtt))
                throw new Error("Invalid MQTT connection")

            mqtt.on("teslamate/#", (topic: string, message: Buffer) => {
                const [_teslamate, _cars, id, key] = topic.split("/")
                let value = message.toString()
    
                if (!(key in TESLAMATE_PROPERTIES))
                    return

                const property = TESLAMATE_PROPERTIES[key]
                if (property.parse)
                    value = property.parse!(value)

                const car = this.services.get(id) || this.registerService(new Car(this, id))
                car.updateValue(key, value)
            })
        })
    }
}

class Car extends Service<TeslaMate> {
    constructor(provider: TeslaMate, id: string) {
        super(provider, id)
        this.registerIdentifier("teslamate", id)
        this.registerType("car")
        this.registerType("battery")

        for (const [key, property] of Object.entries(TESLAMATE_PROPERTIES))
            this.registerProperty(key, typeof property.definition === "string" ? property.definition : {...{
                read_only: true
            }, ...property.definition})
    }
}
