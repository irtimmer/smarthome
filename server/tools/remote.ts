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

    const sendMessage = (data: any) => {
        if (!socket)
            return

        socket.send(JSON.stringify(data))
    }

    const emitServiceEvents = (service: Service) => {
        sendMessage({
            type: 'registerService',
            id: service.id,
            name: service.name,
            priority: service.priority
        })
    
        service.types.forEach(type => service.emit("type", type))
        service.events.forEach((value, key) => service.emit("event", key, value))
        service.properties.forEach((value, key) => service.emit("property", key, value))
        service.actions.forEach((value, key) => service.emit("action", key, value))
        service.identifiers.forEach(id => service.emit("identifier", ...id.split(':')))
        service.values.forEach((value, key) => service.emit("update", key, value, undefined))
    }

    const connect = async () => {
        socket = new WebSocket(`${args.server}/${args.provider}`)
        socket.on('open', () => provider.services.forEach(service => emitServiceEvents(service)))
        socket.on('close', (e: any) => reconnect.retry(e))
        socket.on('error', (e: any) => reconnect.retry(e))
        socket.on('message', (e: any) => {
            const data = JSON.parse(e.toString())
            try {
                const service = provider.services.get(data.id)
                if (!service)
                    return

                if (data.type === 'setValue')
                    service.setValue(data.key, data.value)
                else if (data.type === 'triggerAction')
                    service.triggerAction(data.key, data.props)
            } catch (e) {
                console.error("Error processing message", e);
            }
        });
    }

    reconnect = new Retry(connect, {
        interval: 60,
        retryInterval: 10,
        maxRetries: 5
    })

    provider.on("register", (service: Service) => {
        service.on("type", (name: string) => sendMessage({
            type: 'registerType',
            id: service.id,
            name
        }))

        service.on("registerProperty", (key: string, property: any) => sendMessage({
            type: 'registerProperty',
            id: service.id,
            key, property
        }))

        service.on("registerAction", (key: string, action: any) => sendMessage({
            type: 'registerAction',
            id: service.id,
            key, action
        }))

        service.on("registerEvent", (key: string, event: any) => sendMessage({
            type: 'registerEvent',
            id: service.id,
            key, event
        }))

        service.on("registerIdentifier", (idType: string, identifier: string) => sendMessage({
            type: 'registerIdentifier',
            id: service.id,
            idType, identifier
        }))

        service.on("update", (key: string, value: any, oldValue: any) => sendMessage({
            type: 'updateValue',
            id: service.id,
            key, value
        }))

        service.on("event", (key: string, args: any) => sendMessage({
            type: 'emitEvent',
            id: service.id,
            key, args
        }))

        emitServiceEvents(service)
    })
    provider.on("unregister", (service: Service) => sendMessage({
        type: 'unregisterService',
        id: service.id
    }))

    provider.services.forEach(service => provider.emit("register", service))
})
