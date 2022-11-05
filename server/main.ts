import yaml from 'yaml'
import fs from 'fs'

import Server from './server'
import Providers from './providers'
import ClientApi from './api/client'

const file = fs.readFileSync('./config.yml', 'utf8')
const config = yaml.parse(file)

const providers = new Providers(config.providers)
const server = new Server()
new ClientApi(server, providers)
