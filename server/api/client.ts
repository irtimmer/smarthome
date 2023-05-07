import express, { Router } from 'express'

import Devices, { Device } from '../devices'
import Providers from '../providers'
import Server from '../server'

import { Service } from '../../shared/service'

export default class {
    #eventListeners: {
        response: any
        close: any
    }[]

    constructor(server: Server, providers: Providers, devices: Devices) {
        this.#eventListeners = []

        const api = Router()

        api.use(express.json())
        api.get('/services', (req, res) => {
            res.json(Object.fromEntries(Array.from(providers.services, ([id, service]) => [
                id, this.#serviceToJSON(service)
            ])))
        })

        api.post('/service/:id', (req, res) => {
            const service = providers.services.get(req.params.id)!
            Promise.all(Object.entries(req.body).map(([key, value]) => service.setValue(key, value))).then(() => {
                res.json({
                    'success': true
                })
            }).catch(e => {
                res.json({
                    'error': e,
                    'success': false
                })
            })
        })

        api.post('/service/:id/action/:actionId', (req, res) => {
            const service = providers.services.get(req.params.id)!
            service.triggerAction(req.params.actionId, req.body).then(() => {
                res.json({
                    'success': true
                })
            }).catch(e => {
                res.json({
                    'error': e,
                    'success': false
                })
            })
        })

        api.get('/devices', (_, res) => {
            res.json(Object.fromEntries(Array.from(devices.devices, ([id, device]) => [
                id, this.#deviceToJSON(device)
            ])))
        })

        api.get('/events', (_, res, next) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream'
            })

            this.#eventListeners.push({
                response: res,
                close: next
            })
        })

        server.app.use('/api', api)

        providers.on("update", (service: Service, key: string, value: any, oldValue: any) => {
            this.#notify({
                action: "update",
                id: service.uniqueId,
                key,
                value
            })
        })
    }

    #notify(data: any) {
        for (const listener of this.#eventListeners) {
            listener.response.write("data: ");
            listener.response.write(JSON.stringify(data));
            listener.response.write("\n\n");
        }
    }

    #serviceToJSON(service: Service): any {
        return {
            name: service.name,
            identifiers: Array.from(service.identifiers),
            properties: Object.fromEntries(service.properties),
            values: Object.fromEntries(service.values),
            actions: Object.fromEntries(service.actions),
            types: Array.from(service.types)
        }
    }

    #deviceToJSON(device: Device): any {
        return {
            services: Array.from(device.services).sort((a, b) => b.priority - a.priority).map((service: Service) => service.uniqueId),
            identifiers: Array.from(device.identifiers)
        }
    }
}
