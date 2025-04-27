import { WebSocket } from 'ws'

import Server from '../server'
import Controller from '../controller'
import Provider, { ProviderManager } from '../../shared/provider'
import Service from "../../shared/service"
import Rpc from '../utils/rpc'

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
    rpc: Rpc

    constructor(manager: ProviderManager, socket: WebSocket) {
        super(manager)

        this.rpc = new Rpc(socket, this.#handleCall.bind(this))
        socket.on('close', () => {
            this.services.forEach((service) => {
                this.unregisterService(service)
            })
            this.removeAllListeners()
        })
    }

    async #handleCall(method: string, params: any) {
        if (method === 'registerService')
            return this.registerService(new RemoteService(this, params.id, params.name, params.priority))

        const service = this.services.get(params.id)
        if (!service)
            throw new Error(`Service not found ${params.id}`)

        if (method === 'unregisterService')
            return this.unregisterService(service)
        else if (method === 'updateValue')
            return service.updateValue(params.key, params.value)
        else if (method === 'emitEvent')
            return service.emitEvent(params.key, params.args)
        else if (method === 'registerProperty')
            return service.registerProperty(params.key, params.property, params.value)
        else if (method === 'registerType')
            return service.registerType(params.name)
        else if (method === 'registerAction')
            return service.registerAction(params.key, params.action)
        else if (method === 'registerIdentifier')
            return service.registerIdentifier(params.type, params.identifier)
        else if (method === 'registerEvent')
            return service.registerEvent(params.key, params.event)
    }
}

class RemoteService extends Service<RemoteProvider> {
    constructor(provider: RemoteProvider, id: string, name: string, priority: number) {
        super(provider, id)
        this.name = name
        this.priority = priority
    }

    async setValue(key: string, value: any): Promise<void> {
        return await this.provider.rpc.call('setValue', {
            id: this.id,
            key,
            value
        }) as void
    }

    async triggerAction(key: string, props: any) {
        return await this.provider.rpc.call('triggerAction', {
            id: this.id,
            key,
            props
        }) as void
    }
}
