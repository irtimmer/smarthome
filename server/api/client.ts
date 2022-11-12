import { createRouter, eventHandler } from 'h3'

import Providers from '../providers'
import Server from '../server'

export default class {
    constructor(server: Server, providers: Providers) {
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

        server.use('/api', api.handler)
    }
}
