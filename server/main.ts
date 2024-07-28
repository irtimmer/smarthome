import { YamlInclude } from 'yaml-js-include'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'

import Server from './server'
import ClientApi from './api/client'
import Home from './home'
import Controller from './controller'
import logging from './logging'

const args = yargs(hideBin(process.argv))
    .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Configuration file',
        default: './config.yml'
    }).parseSync()

const logger = logging({
    transport: {
        target: 'pino-pretty',
        options: {
            messageFormat: '{module}{if id}({id}){end} - {msg}',
            ignore: 'pid,hostname,module,id'
        }
    }
})

const yamlInclude = new YamlInclude();
const config = yamlInclude.load<any>(args.config)

const controller = new Controller(config)

const server = new Server(config.server)
new ClientApi(server, controller)

const home = new Home(controller, config.home)
controller.providers.registerProvider(home)

fs.watch(args.config, event => {
    if (event == "change") {
        const config = yamlInclude.load<any>(args.config)

        if (config)
            controller.rules.setConfig(config.rules)
    }
});
