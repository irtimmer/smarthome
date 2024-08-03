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
    hide_null?: boolean
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
    identifiers: [string]
    properties: { [key: string]: any }
    values: { [key: string]: any }
    actions: { [key: string]: any }
    types: [string]
}

let events: EventSource | null = null
let eventQueue: any[] = []

export const useStore = defineStore('main', {
    state: () => ({
        instance: null,
        revision: 0,
        devices: new Map as Map<string, Device>,
        services: new Map as Map<string, Service>
    }),
    actions: {
        onMessage(data: any) {
            // Ignore messages from other instances
            if (data.instance && this.instance != data.instance) {
                this.refresh()
                return
            }

            // Ignore old messages
            if (data.counter < this.revision)
                return

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
        },

        processQueue() {
            eventQueue.forEach(this.onMessage.bind(this))
            eventQueue = []
        },

        connect() {
            if (events)
                events.close()

            eventQueue = []
            events = new EventSource("/api/events")
            events.onopen = _ => {
                if (this.instance === null)
                    this.refresh()
            }
            events.onerror = _ => {
                setTimeout(this.connect, 5000)
            }
            events.onmessage = e => {
                const data = JSON.parse(e.data)

                // Cache events until we have some initial data
                if (this.instance == null)
                    eventQueue.push(data)
                else
                    this.onMessage(data)
            }
        },

        refresh(): Promise<any> {
            this.instance = null

            return Promise.all([
                $fetch("/api/devices").then(async (data: any) => {
                    this.devices = new Map(Object.entries(data.devices))
                    return [data.instance, data.counter]
                }),
                $fetch("/api/services").then(async (data: any) => {
                    this.services = new Map(Object.entries(data.services))
                    return [data.instance, data.counter]
                })
            ]).then(([[instance1, counter1], [instance2, counter2]]) => {
                if (instance1 != instance2)
                    return this.refresh()

                this.instance = instance1
                this.revision = Math.min(counter1, counter2)
                this.processQueue()
            })
        },

        init() {
            // Initial data is fetched when events are connected
            if (!process.server)
                this.connect()
            else
                this.refresh()
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
