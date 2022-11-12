import { createRouter, eventHandler, readBody } from 'h3'

import Devices from '../devices'
import Providers from '../providers'
import Server from '../server'

import Service from '../../shared/service'

export default class {
    constructor(server: Server, providers: Providers, devices: Devices) {
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
                    services: Array.from(device.services).map((service: Service) => service.id),
                    identifiers: Array.from(device.identifiers)
                }
            ]))
        }))

        server.use('/api', api.handler)
    }
}
