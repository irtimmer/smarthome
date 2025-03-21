import { WebSocket } from 'ws'

import Server from '../server'
import Controller from '../controller'
import Provider, { ProviderManager } from '../../shared/provider'
import Service from "../../shared/service"

export default class {
    constructor(server: Server, controller: Controller) {
        const ws = new WebSocket.Server({ server: server.server })

        ws.on('connection', (socket, request) => {
            const id = request.url!.split('/').at(-1)
            if (!id)
                return socket.close()

            const manager = controller.providers.getHelper(id)
            const provider = new RemoteProvider(manager, socket)
            controller.providers.registerProvider(provider)
        })
    }
}

class RemoteProvider extends Provider<RemoteService> {
    socket: WebSocket

    constructor(manager: ProviderManager, socket: WebSocket) {
        super(manager)
        this.socket = socket

        socket.on('message', (message) => {
            const data = JSON.parse(message.toString())
            if (data.method === 'registerService')
                return this.registerService(new RemoteService(this, data.params.id, data.params.name, data.params.priority))

            const service = this.services.get(data.params.id)
            if (!service)
                return

            if (data.method === 'unregisterService')
                this.unregisterService(service)
            else if (data.method === 'updateValue')
                service.updateValue(data.params.key, data.params.value)
            else if (data.method === 'emitEvent')
                service.emitEvent(data.params.event, data.params.props)
            else if (data.method === 'registerProperty')
                service.registerProperty(data.params.key, data.params.property, data.params.value)
            else if (data.method === 'registerType')
                service.registerType(data.params.name)
            else if (data.method === 'registerAction')
                service.registerAction(data.params.key, data.params.action)
            else if (data.method === 'registerIdentifier')
                service.registerIdentifier(data.params.type, data.params.identifier)
            else if (data.method === 'registerEvent')
                service.registerEvent(data.params.key, data.params.event)
        })

        socket.on('close', () => {
            this.services.forEach((service) => {
                this.unregisterService(service)
            })
            this.removeAllListeners()
        })
    }

    sendMessage(data: any) {
        this.socket.send(JSON.stringify(data))
    }
}

class RemoteService extends Service<RemoteProvider> {
    constructor(provider: RemoteProvider, id: string, name: string, priority: number) {
        super(provider, id)
        this.name = name
        this.priority = priority
    }

    async setValue(key: string, value: any) {
        return this.provider.sendMessage({
            method: 'setValue',
            params: {
                id: this.id,
                key,
                value
            }
        })
    }

    async triggerAction(key: string, props: any) {
        return this.provider.sendMessage({
            method: 'triggerAction',
            params: {
                id: this.id,
                key,
                props
            }
        })
    }
}
