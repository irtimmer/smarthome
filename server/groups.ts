import Provider from "../shared/provider";
import Service from "../shared/service";

type GroupConfig = {
    name: string
    children: string[]
    identifiers: string[]
}

export type GroupsConfig = Record<string, GroupConfig>

export default class Groups extends Provider<Group> {
    constructor(config: GroupsConfig) {
        super("groups")
        this.setConfig(config)
    }

    setConfig(config: GroupsConfig) {
        for (const id in config) {
            const service = this.services.get(id)
            if (service)
                service.updateConfig(config[id])
            else
                this.registerService(new Group(this, id, config[id]))
        }
    }
}

class Group extends Service<Groups> {
    constructor(provider: Groups, id: string, config: GroupConfig) {
        super(provider, id)

        this.registerIdentifier("group", id)
        this.registerType("group")

        this.registerProperty("name", "name")
        this.registerProperty("children", {
            "@type": "children",
            type: "services",
            label: "Children",
            read_only: true
        })
        this.updateConfig(config)
    }

    updateConfig(config: GroupConfig) {
        this.updateIdentifiers(config.identifiers.map(id => id.split(":") as [string, string]))
        this.updateValue("children", config.children)
        this.updateValue("name", config.name)
    }
}
