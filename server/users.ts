import Provider from "../shared/provider";
import Service from "../shared/service";
import Controller from "./controller";

type UserConfig = {
    name: string
    devices: {
        id: string
    }[]
}

export type UsersConfig = Record<string, UserConfig>

export default class Users extends Provider<User> {
    readonly controller: Controller

    constructor(controller: Controller, config: UsersConfig) {
        super(controller.providers.getHelper("groups"))
        this.controller = controller

        this.setConfig(config)
    }

    setConfig(config: UsersConfig) {
        const seen_services = new Set
        for (const id in config) {
            const service = this.services.get(id)
            seen_services.add(id)
            if (service)
                service.config = config[id]
            else
                this.registerService(new User(this, id, config[id]))
        }

        // Unregister services that are no longer present
        this.services.forEach(service => {
            if (service instanceof User && !seen_services.has(service.id))
                this.unregisterService(service)
        })
    }
}

class User extends Service<Users> {
    config: UserConfig

    constructor(provider: Users, id: string, config: UserConfig) {
        super(provider, id)
        this.config = config

        this.registerType("user")
        this.registerIdentifier("username", id)
        this.registerProperty("name", "name", config.name)
        this.registerProperty("devices", {
            type: "services",
            label: "Devices",
            read_only: true
        })

        this.updateConfig(config)
    }

    updateConfig(config: UserConfig) {
        this.updateValue("devices", config.devices.map(device => device.id))
    }
}
