import fs from 'fs'
import { createServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import express, { Express } from 'express'

import ClientApi from './api/client'
import ProviderApi from './api/provider'
import Controller from './controller'

interface ServerConfig {
    key?: string
    cert?: string
    remote_providers?: boolean
}

export default class Server {
    readonly app: Express
    readonly server: any

    constructor(controller: Controller, config: ServerConfig) {
        this.app = express()

        if (config.key && config.cert) {
            this.server = createHttpsServer({
                key: fs.readFileSync(config.key),
                cert: fs.readFileSync(config.cert),
            }, this.app).listen(process.env.HTTPS_PORT || 3443)
        } else {
            this.server = createServer(this.app).listen(process.env.PORT || 3000)
        }

        new ClientApi(this, controller)
        if (config.remote_providers)
            new ProviderApi(this, controller)
    }
}
