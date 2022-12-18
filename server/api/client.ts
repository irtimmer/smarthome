import { createRouter, eventHandler, readBody } from 'h3'

import Devices from '../devices'
import Providers from '../providers'
import Server from '../server'

import Service from '../../shared/service'
import Provider from '../../shared/provider'

export default class {
    #eventListeners: {
        response: any
        close: any
    }[]

    constructor(server: Server, providers: Providers, devices: Devices) {
        this.#eventListeners = []

        const api = createRouter()
        api.get('/services', eventHandler(_ => {
            return Object.fromEntries(Array.from(providers.services, ([id, service]) => [
                id, {
                    name: service.name || id,
                    identifiers: Array.from(service.identifiers),
                    properties: Object.fromEntries(service.properties),
                    values: Object.fromEntries(service.values),
                    types: Array.from(service.types)
                }
            ]))
        }))

        api.post('/service/:id', eventHandler(async event => {
            try {
                const service = providers.services.get(event.context.params.id)!
                const json = await readBody(event)
                for (const [key, value] of Object.entries(json))
                    await service.setValue(key, value)

                return {
                    'success': true
                }
            } catch (e) {
                return {
                    'error': e,
                    'success': false
                }
            }
        }))

        api.get('/devices', eventHandler(_ => {
            return Object.fromEntries(Array.from(devices.devices, ([id, device]) => [
                id, {
                    services: Array.from(device.services).map((service: Service<any>) => `${service.provider.id}:${service.id}`),
                    identifiers: Array.from(device.identifiers)
                }
            ]))
        }))

        api.get('/events', eventHandler(event => {
            return new Promise((resolve, _) => {
                event.res.writeHead(200, {
                    'Content-Type': 'text/event-stream'
                })

                this.#eventListeners.push({
                    response: event.res,
                    close: resolve
                })
            })
        }))
        
        server.use('/api', api.handler)

        providers.on("update", (provider: Provider<any>, service: Service<any>, key: string, value: any, oldValue: any) => {
            for (const listener of this.#eventListeners) {
                listener.response.write("data: ");
                listener.response.write(JSON.stringify({
                    action: "update",
                    id: `${provider.id}:${service.id}`,
                    key,
                    value
                }));
                listener.response.write("\n\n");
            }
        })
    }
}
