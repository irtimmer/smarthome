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
            method: 'registerService',
            params: {
                id: service.id,
                name: service.name,
                priority: service.priority
            }
        })
    
        service.types.forEach(type => service.emit("type", type))
        service.events.forEach((value, key) => service.emit("registerEvent", key, value))
        service.properties.forEach((value, key) => service.emit("registerProperty", key, value))
        service.actions.forEach((value, key) => service.emit("registerAction", key, value))
        service.identifiers.forEach(id => service.emit("registerIdentifier", ...id.split(':')))
    }

    const connect = async () => {
        socket = new WebSocket(`${args.server}/${args.provider}`)
        socket.on('open', () => provider.services.forEach(service => emitServiceEvents(service)))
        socket.on('close', (e: any) => reconnect.retry(e))
        socket.on('error', (e: any) => reconnect.retry(e))
        socket.on('message', (e: any) => {
            const data = JSON.parse(e.toString())
            try {
                const service = provider.services.get(data.params.id)
                if (!service)
                    return

                if (data.method === 'setValue')
                    service.setValue(data.params.key, data.params.value)
                else if (data.method === 'triggerAction')
                    service.triggerAction(data.params.key, data.params.props)
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
            method: 'registerType',
            params: {
                id: service.id,
                name
            }
        }))

        service.on("registerProperty", (key: string, property: any) => sendMessage({
            method: 'registerProperty',
            params: {
                id: service.id,
                key,
                property,
                value: service.values.get(key)
            }
        }))

        service.on("registerAction", (key: string, action: any) => sendMessage({
            method: 'registerAction',
            params: {
                id: service.id,
                key,
                action
            }
        }))

        service.on("registerEvent", (key: string, event: any) => sendMessage({
            method: 'registerEvent',
            params: {
                id: service.id,
                key,
                event
            }
        }))

        service.on("registerIdentifier", (type: string, identifier: string) => sendMessage({
            method: 'registerIdentifier',
            params: {
                id: service.id,
                type,
                identifier
            }
        }))

        service.on("update", (key: string, value: any, oldValue: any) => sendMessage({
            method: 'updateValue',
            params: {
                id: service.id,
                key,
                value
            }
        }))

        service.on("event", (key: string, args: any) => sendMessage({
            method: 'emitEvent',
            params: {
                id: service.id,
                key,
                args
            }
        }))

        emitServiceEvents(service)
    })
    provider.on("unregister", (service: Service) => sendMessage({
        method: 'unregisterService',
        params: {
            id: service.id
        }
    }))

    provider.services.forEach(service => provider.emit("register", service))
})
