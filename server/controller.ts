import { Service } from "../shared/service"

import Constraints from "./constraints"
import Devices from "./devices"
import Groups, { GroupsConfig } from "./groups"
import Handlers from "./handlers"
import History, { HistoryConfig } from "./history"
import Connectors from "./connectors"
import MetadataManager, { MetadataConfig } from "./metadata"
import Providers from "./providers"
import Rules, { RulesConfig } from "./rules"
import Scenes, { ScenesConfig } from "./scenes"
import Users, { UsersConfig } from "./users"
import UI, { UIConfig } from "./ui"

type ControllerConfig = {
    connections: Record<string, any>
    providers: Record<string, any>
    rules: RulesConfig
    scenes: ScenesConfig
    history: HistoryConfig
    groups: GroupsConfig
    metadata: MetadataConfig
    users: UsersConfig
    ui: UIConfig
}

export default class Controller {
    readonly connectors: Connectors
    readonly providers: Providers
    readonly devices: Devices
    readonly history: History
    readonly constraints: Constraints
    readonly handlers: Handlers
    readonly metadata: MetadataManager
    readonly rules: Rules
    readonly scenes: Scenes
    readonly groups: Groups
    readonly users: Users
    readonly ui: UI

    constructor(config: ControllerConfig) {
        this.connectors = new Connectors(config.connections)

        this.providers = new Providers(config.providers, this.connectors)
        this.devices = new Devices(this.providers)
        this.history = new History(this, config.history)

        this.constraints = new Constraints(this)
        this.handlers = new Handlers(this)
        this.metadata = new MetadataManager(this, config.metadata)
        this.rules = new Rules(this, config.rules)
        this.scenes = new Scenes(this, config.scenes)
        this.groups = new Groups(this, config.groups)
        this.users = new Users(this, config.users)
        this.ui = new UI(config.ui)

        this.providers.registerProvider(this.rules)
        this.providers.registerProvider(this.scenes)
        this.providers.registerProvider(this.groups)
        this.providers.registerProvider(this.metadata)
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

    setConfig(config: ControllerConfig) {
        this.rules.setConfig(config.rules)
        this.scenes.setConfig(config.scenes)
        this.groups.setConfig(config.groups)
        this.metadata.setConfig(config.metadata)
        this.users.setConfig(config.users)
        this.ui.setConfig(config.ui)
        this.combiner.setConfig(config.combiner)
    }
}
