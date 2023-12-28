import { Service } from "../shared/service"

import Constraints from "./constraints"
import Devices from "./devices"
import Handlers from "./handlers"
import History, { HistoryConfig } from "./history"
import Providers from "./providers"
import Rules, { RulesConfig } from "./rules"

type ControllerConfig = {
    providers: Record<string, any>
    rules: RulesConfig
    history: HistoryConfig
}

export default class Controller {
    readonly providers: Providers
    readonly devices: Devices
    readonly history: History
    readonly constraints: Constraints
    readonly handlers: Handlers
    readonly rules: Rules

    constructor(config: ControllerConfig) {
        this.providers = new Providers(config.providers)
        this.devices = new Devices(this.providers)
        this.history = new History(this, config.history)

        this.constraints = new Constraints(this)
        this.handlers = new Handlers(this)
        this.rules = new Rules(this, config.rules)
    }

    // Set a value on a service, constrained by the constraints and handler by handlers
    async setValue(service: Service, key: string, value: any): Promise<void> {
        value = this.constraints.constrainValue(service, key, value)
        this.setConstrainedValue(service, key, value)
    }

    // This is a separate function so that it can be called from the constraints
    async setConstrainedValue(service: Service, key: string, value: any): Promise<void> {
        if (!await this.handlers.setValue(service, key, value))
            return service.setValue(key, value)
    }
}
