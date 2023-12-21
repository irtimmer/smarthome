import fs from 'fs'
import { createServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import express, { Express } from 'express'

interface ServerConfig {
    key?: string
    cert?: string
}

export default class Server {
    readonly app: Express

    constructor(config: ServerConfig) {
        this.app = express()
        createServer(this.app).listen(process.env.PORT || 3000)

        if (config.key && config.cert) {
            createHttpsServer({
                key: fs.readFileSync(config.key),
                cert: fs.readFileSync(config.cert),
            }, this.app).listen(process.env.HTTPS_PORT || 3443)
        }
    }
}
