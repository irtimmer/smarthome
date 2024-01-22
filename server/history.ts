import { Logger } from "../shared/logger";
import { Service } from "../shared/service";
import Controller from "./controller";

export type HistoryConfig = {
    logger?: {
        type: string
    },
    track: {
        service_type: string,
        property_type: string
    }[]
}

export default class History {
    #logger?: Logger

    constructor(controller: Controller, config: HistoryConfig) {
        if (!config.logger)
            return

        import(`../providers/${config.logger.type}.js`).then((loggerModule) => {
            this.#logger = new loggerModule.default(config.logger);
        }).catch(e => {
            console.error(`Can't load ${config.logger!.type}`, e)
        })

        controller.providers.on("update", (service: Service, key: string, value: any, oldValue: any) => {
            const tracker = config.track.find(track =>
                (!track.service_type || service.types.has(track.service_type)) &&
                service.properties.get(key)?.["@type"] == track.property_type
            )

            if (!tracker)
                return

            let type = service.properties.get(key)?.["@type"] ?? "generic"
            this.#logger?.write(service.uniqueId, type, key, value, oldValue)
        })
    }
}
