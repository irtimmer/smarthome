import { Service } from "../shared/service"

import Constraints from "./constraints"
import Devices from "./devices"
import Groups, { GroupsConfig } from "./groups"
import Handlers from "./handlers"
import History, { HistoryConfig } from "./history"
import Connectors from "./connectors"
import Providers from "./providers"
import Rules, { RulesConfig } from "./rules"
import Scenes, { ScenesConfig } from "./scenes"
import Users, { UsersConfig } from "./users"

type ControllerConfig = {
    connections: Record<string, any>
    providers: Record<string, any>
    rules: RulesConfig
    scenes: ScenesConfig
    history: HistoryConfig
    groups: GroupsConfig
    users: UsersConfig
}

export default class Controller {
    readonly connectors: Connectors
    readonly providers: Providers
    readonly devices: Devices
    readonly history: History
    readonly constraints: Constraints
    readonly handlers: Handlers
    readonly rules: Rules
    readonly scenes: Scenes
    readonly groups: Groups
    readonly users: Users

    constructor(config: ControllerConfig) {
        this.connectors = new Connectors(config.connections)

        this.providers = new Providers(config.providers, this.connectors)
        this.devices = new Devices(this.providers)
        this.history = new History(this, config.history)

        this.constraints = new Constraints(this)
        this.handlers = new Handlers(this)
        this.rules = new Rules(this, config.rules)
        this.scenes = new Scenes(this, config.scenes)
        this.groups = new Groups(this, config.groups)
        this.users = new Users(this, config.users)

        this.providers.registerProvider(this.rules)
        this.providers.registerProvider(this.scenes)
        this.providers.registerProvider(this.groups)
        this.providers.registerProvider(this.users)
    }

    // Set a value on a service, constrained by the constraints and handler by handlers
    async setValue(service: Service, key: string, value: any) {
        value = this.constraints.constrainValue(service, key, value)
        await this.setConstrainedValue(service, key, value)
    }

    // This is a separate function so that it can be called from the constraints
    async setConstrainedValue(service: Service, key: string, value: any) {
        if (!await this.handlers.setValue(service, key, value))
            await service.setValue(key, value)
    }
}
