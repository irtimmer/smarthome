import Constraints from "./constraints"
import Devices from "./devices"
import Providers from "./providers"
import Rules, { RulesConfig } from "./rules"

type ControllerConfig = {
    providers: Record<string, any>
    rules: RulesConfig
}

export default class Controller {
    readonly providers: Providers
    readonly devices: Devices
    readonly constraints: Constraints
    readonly rules: Rules

    constructor(config: ControllerConfig) {
        this.providers = new Providers(config.providers)
        this.devices = new Devices(this.providers)

        this.constraints = new Constraints(this)
        this.rules = new Rules(this, config.rules)
    }
}
