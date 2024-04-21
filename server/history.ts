import { Logger } from "../shared/logger";
import { Service } from "../shared/service";
import logging from "../shared/logging";

import Controller from "./controller";

export type HistoryConfig = {
    logger?: {
        type: string
    },
    track: {
        service_type: string,
        property_type: string
        timestamp_property?: string
        maximum?: number
        minimum?: number
    }[]
}

export default class History {
    logger: ReturnType<typeof logging>
    #logger?: Logger

    constructor(controller: Controller, config: HistoryConfig) {
        this.logger = logging().child({ module: "history" })
        if (!config.logger)
            return

        import(`../providers/${config.logger.type}.js`).then((loggerModule) => {
            this.#logger = new loggerModule.default(config.logger);
        }).catch((e: any) => {
            this.logger.error({ module: config.logger!.type }, "Can't load provider: %s", e.message)
        })

        controller.providers.on("update", (service: Service, key: string, value: any, oldValue: any) => {
            const tracker = config.track.find(track =>
                (!track.service_type || service.types.has(track.service_type)) &&
                service.properties.get(key)?.["@type"] == track.property_type
            )

            if (!tracker)
                return

            if (tracker.maximum !== undefined) {
                if (value > tracker.maximum)
                    return

                if (oldValue > tracker.maximum)
                    oldValue = undefined
            }

            if (tracker.minimum !== undefined) {
                if (value < tracker.minimum)
                    return

                if (oldValue < tracker.minimum)
                    oldValue = undefined
            }

            let timestamp = null
            if (tracker.timestamp_property)
                timestamp = service.values.get(tracker.timestamp_property)

            let type = service.properties.get(key)?.["@type"] ?? "generic"
            this.#logger?.write(service.uniqueId, type, key, value, oldValue, timestamp)
        })
    }
}
