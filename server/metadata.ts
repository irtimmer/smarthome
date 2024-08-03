import Controller from "./controller"

import Provider from "../shared/provider"
import Service from "../shared/service";

export type MetadataConfig = {
  identifiers: string[]
}[]

export default class MetadataManager extends Provider<Metadata> {
  readonly controller: Controller

  constructor(controller: Controller, config: MetadataConfig) {
    super(controller.providers.getHelper("metadata"))
    this.controller = controller
    this.setConfig(config)
  }

  setConfig(config: MetadataConfig) {
    for (const id in config) {
      const service = this.services.get(id) ?? this.registerService(new Metadata(this, id))
      for (const identifier of config[id].identifiers) {
        const [type, id] = identifier.split(':')
        service.registerIdentifier(type, id)
      }
    }
  }
}

class Metadata extends Service<MetadataManager> {
  constructor(provider: MetadataManager, id: string) {
    super(provider, id)

    this.name = "Metadata"
  }
}
