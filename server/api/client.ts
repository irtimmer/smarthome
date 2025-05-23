import express, { Router } from 'express'
import { v1 as uuidv1 } from 'uuid';

import { Service } from '../../shared/service'

import { Device } from '../devices'
import { Constraint } from '../constraints'
import { Rule } from '../rule';
import Server from '../server'
import Controller from '../controller';

export default class {
    #eventListeners: {
        response: any
        close: any
    }[]

    // Unique identifier for this SmartHome instance to detect restarts
    #instance: string
    // Track revision number for event stream
    #revision: number

    constructor(server: Server, controller: Controller) {
        this.#eventListeners = []
        this.#instance = uuidv1()
        this.#revision = 0

        const devices = controller.devices
        const providers = controller.providers

        const api = Router()

        api.use(express.json())
        api.get('/services', (req, res) => {
            res.json({
                instance: this.#instance,
                counter: this.#revision,
                services: Object.fromEntries(Array.from(providers.services, ([id, service]) => [
                    id, this.#serviceToJSON(service)
                ]))
            })
        })

        api.post('/service/:id', (req, res) => {
            const service = providers.services.get(req.params.id)!
            Promise.all(Object.entries(req.body).map(([key, value]) => controller.setValue(service,key, value))).then(() => {
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
            res.json({
                instance: this.#instance,
                counter: this.#revision,
                devices: Object.fromEntries(Array.from(devices.devices, ([id, device]) => [
                    id, this.#deviceToJSON(device)
                ]))
            })
        })

        api.get('/rules', (_, res) => {
            res.json(controller.rules.rules.map(rule => this.#ruleToJSON(rule)))
        })

        api.get('/constraints', (_, res) => {
            res.json({
                instance: this.#instance,
                counter: this.#revision,
                constraints: Object.fromEntries(Array.from(controller.constraints.constraints.entries()).map(([service, properties]) => [
                    service.uniqueId, Object.fromEntries(Array.from(properties).map(([id, constraints]) => [
                        id, constraints.map(c => this.#constraintToJSON(c))
                    ]))
                ]))
            })
        })

        api.get('/events', (_, res, next) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream'
            })

            // Send hello message with instance and revision number
            res.write("data: ");
            res.write(JSON.stringify({
                action: "hello",
                instance: this.#instance,
                counter: this.#revision
            }));
            res.write("\n\n");

            this.#eventListeners.push({
                response: res,
                close: next
            })
        })

        api.get('/layouts', (_, res) => {
            res.json(Object.keys(controller.ui.config.layouts))
        })

        api.get('/layout/:id', (req, res) => {
            res.json(controller.ui.config.layouts[req.params.id])
        })

        server.app.use('/api', api)

        providers.on("register", (service: Service) => {
            this.#notify({
                action: "register",
                id: service.uniqueId,
                service: this.#serviceToJSON(service)
            })
        })

        providers.on("unregister", (service: Service) => {
            this.#notify({
                action: "unregister",
                id: service.uniqueId
            })
        })

        providers.on("update", (service: Service, key: string, value: any, oldValue: any) => {
            this.#notify({
                action: "update",
                id: service.uniqueId,
                key,
                value
            })
        })

        devices.on("update", (id: string) => {
            this.#notify({
                action: "deviceUpdate",
                id,
                device: this.#deviceToJSON(devices.devices.get(id)!)
            })
        })

        devices.on("delete", (id: string) => {
            this.#notify({
                action: "deviceDelete",
                id
            })
        })

        controller.constraints.on("update", (service: Service, key: string, constraints: Constraint[]) => {
            this.#notify({
                action: "constraintsUpdate",
                id: service.uniqueId,
                key,
                constraints: constraints.map(c => this.#constraintToJSON(c))
            })
        })
    }

    #notify(data: any) {
        data['counter'] = this.#revision++
        for (const listener of this.#eventListeners) {
            listener.response.write("data: ");
            listener.response.write(JSON.stringify(data));
            listener.response.write("\n\n");
        }
    }

    #serviceToJSON(service: Service): any {
        return {
            name: service.name,
            priority: service.priority,
            identifiers: Array.from(service.identifiers),
            properties: Object.fromEntries(service.properties),
            values: Object.fromEntries(service.values),
            actions: Object.fromEntries(service.actions),
            events: Object.fromEntries(service.events),
            types: Array.from(service.types)
        }
    }

    #deviceToJSON(device: Device): any {
        return {
            services: Array.from(device.services).sort((a, b) => b.priority - a.priority).map((service: Service) => service.uniqueId),
            identifiers: Array.from(device.identifiers)
        }
    }

    #ruleToJSON(rule: Rule): any {
        return {
            type: rule.constructor.name,
            watchers: {
                services: Array.from(rule.watchServices.values()),
                devices: Array.from(rule.watchDevices.values()),
                properties: Array.from(rule.watchProperties.values())
            },
            constraints: Array.from(rule.constraints.values()),
            sub_rules: rule.subRules.map(r => this.#ruleToJSON(r))
        }
    }

    #constraintToJSON(constraint: Constraint): any {
        return {
            action: constraint.action,
            handle: constraint.handle,
            priority: constraint.priority,
            keep: constraint.keep,
            active_timer: Boolean(constraint.timer !== undefined),
            value: constraint.value
        }
    }
}
