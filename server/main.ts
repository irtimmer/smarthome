import yaml from 'yaml'
import fs from 'fs'

import Server from './server'
import ClientApi from './api/client'
import Home from './home'
import Controller from './controller'

import logging from '../shared/logging'

const logger = logging({
    transport: {
        target: 'pino-pretty',
        options: {
            messageFormat: '{module}{if id}({id}){end} - {msg}',
            ignore: 'pid,hostname,module,id'
        }
    }
})

const CONFIG_FILE = './config.yml'

const file = fs.readFileSync(CONFIG_FILE, 'utf8')
const config = yaml.parse(file)

const controller = new Controller(config)

const server = new Server(config.server)
new ClientApi(server, controller)

const home = new Home(controller, config.home)
controller.providers.registerProvider(home)

fs.watch(CONFIG_FILE, event => {
    if (event == "change") {
        const file = fs.readFileSync(CONFIG_FILE, 'utf8')
        const config = yaml.parse(file)

        if (config)
            controller.rules.setConfig(config.rules)
    }
});
