import { defineStore } from 'pinia'

type PropertyGroup = 'internal' | 'config' | 'meta'

export interface Device {
    services: [string]
    identifiers: [string]
}

export interface Property {
    '@type'?: string
    type: string
    logical_type?: string
    label: string
    read_only: boolean
    group?: PropertyGroup
    min?: number
    max?: number
    unit?: string
    options?: { [key: string]: string } | { [key: string]: number }
}

export interface Action {
    label: string
    group?: PropertyGroup
}

export interface Service {
    name?: string
    properties: { [key: string]: any }
    values: { [key: string]: any }
    actions: { [key: string]: any }
    types: [string]
}

export const useStore = defineStore('main', {
    state: () => ({
        devices: new Map as Map<string, Device>,
        services: new Map as Map<string, Service>
    }),
    actions: {
        init() {
            if (!process.server) {
                const events = new EventSource("/api/events")
                events.onmessage = e => {
                    const data = JSON.parse(e.data)
                    switch (data.action) {
                        case "register":
                            this.services.set(data.id, data.service)
                            break
                        case "unregister":
                            this.services.delete(data.id)
                            break
                        case "update":
                            const service = this.services.get(data.id)
                            if (service)
                                service.values[data.key] = data.value

                            break
                        case "deviceUpdate":
                            this.devices.set(data.id, data.device)
                            break
                        case "deviceDelete":
                            this.devices.delete(data.id)
                    }
                }
            }

            return Promise.all([
                $fetch("/api/devices").then(async (data: any) => {
                    this.devices = new Map(Object.entries(data))
                }),
                $fetch("/api/services").then(async (data: any) => {
                    this.services = new Map(Object.entries(data))
                })
            ])
        },

        update(id: string, key: string, value: any) {
            const service = this.services.get(id)!
            const oldValue = service.values[key]
            service.values[key] = value
            $fetch(`/api/service/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    [key]: value
                }),
            }).then(async (json: any) => {
                if (!json.success)
                    service.values[key] = oldValue
            }).catch(() => {
                service.values[key] = oldValue
            })
        },

        triggerAction(id: string, key: string, props?: any) {
            $fetch(`/api/service/${id}/action/${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(props ?? {}),
            })
        }
    }
})
