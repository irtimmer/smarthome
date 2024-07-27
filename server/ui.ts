export type UIConfig = {
    layouts: Record<string, any>
}

export default class UI {
    readonly config: UIConfig

    constructor(config: UIConfig) {
        this.config = config
    }
}
