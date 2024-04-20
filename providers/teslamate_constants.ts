import { Property } from "../shared/definitions"

interface TeslaServiceProperty {
    parse?: (data: any) => any
    definition: Omit<Property, 'read_only'> | string
}

export const TESLAMATE_PROPERTIES: Record<string, TeslaServiceProperty> = {
    display_name: {
        definition: 'name'
    },
    battery_level: {
        parse: (data: any) => parseInt(data),
        definition: {
            '@type': 'battery',
            type: 'number',
            label: 'Battery Level',
        }
    },
    speed: {
        parse: (data: any) => parseInt(data),
        definition: {
            '@type': 'speed',
            type: 'number',
            label: 'Speed',
        }
    },
    outside_temp: {
        parse: (data: any) => parseFloat(data),
        definition: {
            '@type': 'temperature',
            type: 'number',
            label: 'Outside Temperature',
        }
    },
    inside_temp: {
        parse: (data: any) => parseFloat(data),
        definition: {
            '@type': 'temperature',
            type: 'number',
            label: 'Inside Temperature',
        }
    },
    locked: {
        parse: (data: any) => data === 'true',
        definition: {
            '@type': 'lock',
            type: 'boolean',
            label: 'Locked',
        }
    },
    windows_open: {
        parse: (data: any) => data === 'true',
        definition: {
            '@type': 'window',
            type: 'boolean',
            label: 'Windows Open',
        }
    }
}
