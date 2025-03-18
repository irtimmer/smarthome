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
            if (data.type === 'registerService')
                return this.registerService(new RemoteService(this, data.id, data.name, data.priority))

            const service = this.services.get(data.id)
            if (!service)
                return
            
            if (data.type === 'unregisterService')
                this.unregisterService(service)
            else if (data.type === 'updateValue')
                service.updateValue(data.key, data.value)
            else if (data.type === 'emitEvent')
                service.emitEvent(data.event, data.props)
            else if (data.type === 'registerProperty')
                service.registerProperty(data.key, data.property)
            else if (data.type === 'registerType')
                service.registerType(data.name)
            else if (data.type === 'registerAction')
                service.registerAction(data.key, data.action)
            else if (data.type === 'registerIdentifier')
                service.registerIdentifier(data.type, data.id)
            else if (data.type === 'registerEvent')
                service.registerEvent(data.key, data.event)
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
            type: 'setValue',
            id: this.id,
            key,
            value
        })
    }

    async triggerAction(key: string, props: any) {
        return this.provider.sendMessage({
            type: 'triggerAction',
            id: this.id,
            key,
            props
        })
    }
}
