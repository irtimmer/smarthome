import fs from 'fs'
import yaml from 'yaml'
import { WebSocket } from "ws"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import logging from '../logging'
import Connectors from '../connectors'
import ProviderHelper from '../providerhelper'
import Provider from '../../shared/provider'
import { Service } from '../../shared/service'
import { Retry } from '../../shared/utils/poll'
import Rpc from '../utils/rpc'

logging({
    transport: {
        target: 'pino-pretty',
        options: {
            messageFormat: '{module}{if id}({id}){end} - {msg}',
            ignore: 'pid,hostname,module,id'
        }
    }
})

const args = yargs(hideBin(process.argv))
    .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Configuration file',
        default: './config.yml'
    })
    .option('server', {
        alias: 's',
        type: 'string',
        description: 'Server address',
        default: 'ws://localhost:3000'
    })
    .option('provider', {
        alias: 'p',
        type: 'string',
        description: 'Provider identifier',
        demandOption: true
    })
    .parseSync()

const file = fs.readFileSync(args.config, 'utf8')
const config = yaml.parse(file)
const providerConfig = config.providers[args.provider]

import(`../../providers/${args.provider}`).then((providerClass) => {
    const connectors = new Connectors(config.connections)

    const providerHelper = new ProviderHelper(args.provider, connectors)
    const provider = new providerClass.default(providerHelper, providerConfig) as Provider<Service>

    let socket: any = null
    let reconnect: any = null
    let rpc: Rpc | null = null

    const emitServiceEvents = (service: Service) => {
        rpc?.call('registerService', {
            id: service.id,
            name: service.name,
            priority: service.priority
        })
    
        service.types.forEach(type => service.emit("registerType", type))
        service.events.forEach((value, key) => service.emit("registerEvent", key, value))
        service.properties.forEach((value, key) => service.emit("registerProperty", key, value))
        service.actions.forEach((value, key) => service.emit("registerAction", key, value))
        service.identifiers.forEach(id => service.emit("registerIdentifier", ...id.split(':')))
    }

    const connect = async () => {
        socket = new WebSocket(`${args.server}/${args.provider}`)
        socket.on('open', () => provider.services.forEach(service => emitServiceEvents(service)))
        socket.on('close', (code: number, reason: Buffer) => {
            rpc = null
            reconnect.retry(reason.toString)
        })
        socket.on('error', (e: Error) => reconnect.retry(e))
        rpc = new Rpc(socket, async (method: string, params: any) => {
            const service = provider.services.get(params.id)
            if (!service)
                throw new Error(`Service not found ${params.id}`)

            if (method === 'setValue')
                return service.setValue(params.key, params.value)
            else if (method === 'triggerAction')
                return service.triggerAction(params.key, params.props)
            else
                throw new Error(`Unknown method ${method}`)
        })
    }

    reconnect = new Retry(connect, {
        interval: 60,
        retryInterval: 10,
        maxRetries: 5
    })

    provider.on("register", (service: Service) => {
        service.on("registerType", (name: string) => rpc?.call('registerType', {
            id: service.id,
            name
        }))

        service.on("registerProperty", (key: string, property: any) => rpc?.call('registerProperty', {
            id: service.id,
            key,
            property,
            value: service.values.get(key)
        }))

        service.on("registerAction", (key: string, action: any) => rpc?.call('registerAction', {
            id: service.id,
            key,
            action
        }))

        service.on("registerEvent", (key: string, event: any) => rpc?.call('registerEvent', {
            id: service.id,
            key,
            event
        }))

        service.on("registerIdentifier", (type: string, identifier: string) => rpc?.call('registerIdentifier', {
            id: service.id,
            type,
            identifier
        }))

        service.on("update", (key: string, value: any) => rpc?.call('updateValue', {
            id: service.id,
            key,
            value
        }))

        service.on("event", (key: string, args: any) => rpc?.call('emitEvent', {
            id: service.id,
            key,
            args
        }))

        emitServiceEvents(service)
    })
    provider.on("unregister", (service: Service) => rpc?.call('unregisterService', {
        id: service.id
    }))

    provider.services.forEach(service => provider.emit("register", service))
})
