import { Logger } from "pino";

import { ProviderManager } from "../shared/provider";
import Store from "../shared/store";

import Connectors from "./connectors";
import Storage from "./storage";
import logging from "./logging";

export default class ProviderHelper implements ProviderManager {
    readonly id: string
    readonly #connectors: Connectors

    constructor(id: string, connectors: Connectors) {
        this.id = id
        this.#connectors = connectors
    }

    getConnection(name: string): Promise<any> {
        return this.#connectors.connections.get(name)
    }

    get storage(): Store {
        return new Storage(this.id)
    }

    get logger(): Logger {
        return logging().child({ module: this.id })
    }
}
