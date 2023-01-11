import { createServer } from 'http'
import express, { Express } from 'express'

export default class Server {
    readonly app: Express

    constructor() {
        this.app = express()
        createServer(this.app).listen(process.env.PORT || 3000)
    }
}
