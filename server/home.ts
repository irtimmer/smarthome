import Provider from "../shared/provider";
import Service from "../shared/service";

import Controller from "./controller";

type HomeConfig = {
}

export default class Home extends Provider<Service<Home>> {
    readonly controller: Controller

    constructor(controller: Controller, config: HomeConfig) {
        super("home")
        this.controller = controller

        this.registerService(new HomeService(this))
    }
}

class HomeService extends Service<Home> {
    constructor(provider: Home) {
        super(provider, 'home')
        this.registerIdentifier('provider', provider.id)
        this.registerType("home")

        this.name = "Home"
    }
}
