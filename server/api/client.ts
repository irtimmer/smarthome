import { createRouter, eventHandler } from 'h3'

import Devices from '../devices'
import Providers from '../providers'
import Server from '../server'

import Service from '../../shared/service'

export default class {
    constructor(server: Server, providers: Providers, devices: Devices) {
        const api = createRouter()
        api.get('/services/:id', eventHandler(event => {
            const provider = providers.providers.get(event.context.params.id)!
            return Object.fromEntries(Array.from(provider.services, ([id, service]) => [
                id, {
                    name: service.name || id,
                    identifiers: Array.from(service.identifiers),
                    properties: Object.fromEntries(service.properties),
                    values: Object.fromEntries(service.values),
                }
            ]))
        }))

        api.get('/devices', eventHandler(_ => {
            return Object.fromEntries(Array.from(devices.devices, ([id, device]) => [
                id, {
                    services: Array.from(device.services).map((service: Service) => service.id),
                    identifiers: Array.from(device.identifiers)
                }
            ]))
        }))

        server.use('/api', api.handler)
    }
}
