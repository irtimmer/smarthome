import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'

import Server from './server'
import ClientApi from './api/client'
import ProviderApi from './api/provider'
import Home from './home'
import Controller from './controller'
import logging from './logging'
import { YamlIncludeWatcher } from './utils/yaml'

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

const yamlInclude = new YamlIncludeWatcher()
const config = yamlInclude.load<any>(args.config)

const controller = new Controller(config)

const server = new Server(config.server)
new ClientApi(server, controller)
new ProviderApi(server, controller)

const home = new Home(controller, config.home)
controller.providers.registerProvider(home)

let watchers: fs.FSWatcher[] = []
function reload(event: string) {
    if (event == "change") {
        yamlInclude.reset()
        const config = yamlInclude.load<any>(args.config)

        if (config)
            controller.setConfig(config)

        watchers.forEach((watcher) => watcher.close())
        watchers = yamlInclude.filePaths.map((filePath) => fs.watch(filePath, reload))
    }
}

watchers = yamlInclude.filePaths.map((filePath) => fs.watch(filePath, reload))
