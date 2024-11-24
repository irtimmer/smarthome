import Controller from "./controller"

import Provider from "../shared/provider";
import Service from "../shared/service";

type SceneConfig = {
    name: string
    id: string
    values: Record<string, Record<string, any>>
}

export type ScenesConfig = Record<string, SceneConfig>

export default class Scenes extends Provider<Scene> {
    readonly controller: Controller

    constructor(controller: Controller, config: ScenesConfig) {
        super(controller.providers.getHelper("scenes"))
        this.controller = controller

        this.setConfig(config)
    }

    setConfig(config: ScenesConfig) {
        const seen_services = new Set

        for (const id in config) {
            const service = this.services.get(id)
            seen_services.add(id)
            if (service)
                service.config = config[id]
            else
                this.registerService(new Scene(this, id, config[id]))
        }

        // Unregister services that are no longer present
        this.services.forEach(service => {
            if (service instanceof Scene && !seen_services.has(service.id))
                this.unregisterService(service)
        })
    }
}

class Scene extends Service<Scenes> {
    config: SceneConfig

    constructor(provider: Scenes, id: string, config: SceneConfig) {
        super(provider, id)
        this.config = config

        this.registerType("scene")
        this.registerIdentifier(...config.id.split(":") as [string, string])
        this.registerAction("activate", {
            label: config.name
        })
    }

    triggerAction(key: string, props: any): Promise<void> {
        if (key == "activate") {
            let promises = []
            for (const [id, values] of Object.entries(this.config.values)) {
                const service = this.provider.controller.providers.services.get(id)
                if (!service)
                    continue

                for (const [key, value] of Object.entries(values))
                    promises.push(this.provider.controller.setValue(service, key, value))
            }
            return Promise.all(promises).then(() => {})
        } else
            return Promise.reject("Unknown action")
    }
}
