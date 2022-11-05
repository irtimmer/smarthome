import { createServer } from 'http'
import { App, EventHandler, createApp, toNodeListener } from 'h3'

export default class Server {
    #app: App

    constructor() {
        this.#app = createApp()
        createServer(toNodeListener(this.#app)).listen(process.env.PORT || 3000)
    }

    use(route: string, handler: EventHandler) {
        this.#app.use(route, handler)
    }

    get app() {
        return this.#app
    }
}