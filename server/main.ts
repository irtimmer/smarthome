import yaml from 'yaml'
import fs from 'fs'

import Server from './server'
import Providers from './providers'
import ClientApi from './api/client'
import Devices from './devices'
import Rules from './rules'

const CONFIG_FILE = './config.yml'

const file = fs.readFileSync(CONFIG_FILE, 'utf8')
const config = yaml.parse(file)

const providers = new Providers(config.providers)
const devices = new Devices(providers)
const server = new Server()
const rules = new Rules(config.rules, providers, devices)
new ClientApi(server, providers, devices)

fs.watch(CONFIG_FILE, (_, filename) => {
    if (filename) {
        const file = fs.readFileSync(CONFIG_FILE, 'utf8')
        const config = yaml.parse(file)

        rules.setConfig(config.rules)
    }
});
