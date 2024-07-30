import { YamlInclude } from "yaml-js-include";

export class YamlIncludeWatcher extends YamlInclude {
    filePaths: string[] = []

    constructor() {
        super()
    }

    parse<T>(src: string, basePath: string, baseSchema?: any): T {
        this.filePaths.push(basePath)
        return super.parse<T>(src, basePath, baseSchema)
    }

    reset() {
        this.filePaths = []
    }
}
