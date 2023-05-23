import yaml from 'yaml'
import fs from 'fs'

import Server from './server'
import Providers from './providers'
import ClientApi from './api/client'
import Devices from './devices'
import Rules from './rules'
import Constraints from './constraints'

const CONFIG_FILE = './config.yml'

const file = fs.readFileSync(CONFIG_FILE, 'utf8')
const config = yaml.parse(file)

const providers = new Providers(config.providers)
const devices = new Devices(providers)
const server = new Server()
const constraints = new Constraints(providers)
const rules = new Rules(config.rules, providers, devices, constraints)
new ClientApi(server, providers, devices, constraints, rules)

fs.watch(CONFIG_FILE, (_, filename) => {
    if (filename) {
        const file = fs.readFileSync(CONFIG_FILE, 'utf8')
        const config = yaml.parse(file)

        rules.setConfig(config.rules)
    }
});
