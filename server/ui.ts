export type UIConfig = {
    layouts: Record<string, any>
}

export default class UI {
    #config: UIConfig

    constructor(config: UIConfig) {
        this.#config = config
    }

    setConfig(config: UIConfig) {
        this.#config = config
    }

    get config() {
        return this.#config
    }
}
