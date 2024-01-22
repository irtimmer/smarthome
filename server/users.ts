import Provider from "../shared/provider";
import Service from "../shared/service";

type UserConfig = {
    name: string
}

export type UsersConfig = Record<string, UserConfig>

export default class Users extends Provider<User> {
    constructor(config: UsersConfig) {
        super("users")

        this.setConfig(config)
    }

    setConfig(config: UsersConfig) {
        for (const id in config) {
            const service = this.services.get(id)
            if (service)
                service.config = config[id]
            else
                this.registerService(new User(this, id, config[id]))
        }
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
    }
}
