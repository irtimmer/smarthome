import { defineStore } from 'pinia'

export interface Device {
    services: [string]
    identifiers: [string]
}

export interface Property {
    '@type'?: string
    type: string
    label: string
    read_only: boolean
}

export interface Service {
    properties: { [key: string]: any }
    values: { [key: string]: any }
    types: [string]
}

export const useStore = defineStore('main', {
    state: () => ({
        devices: new Map as Map<string, Device>,
        services: new Map as Map<string, Service>
    }),
    actions: {
        init() {
            return Promise.all([
                $fetch("/api/devices").then(async (data: any) => {
                    this.devices = new Map(Object.entries(data))
                }),
                $fetch("/api/services").then(async (data: any) => {
                    this.services = new Map(Object.entries(data))
                })
            ])
        }
    }
})
