import { Property, PropertyGroup } from "../shared/definitions"

type ZWAVE_COMMAND_CLASS_PROPERTY = {
    alias?: string
    set?: string
    definition?: Partial<Property>
} | null

export const ZWAVE_DEVICE_CLASS_TYPES: Record<number, Record<number | '_', string>> = {
    16: { // Binary Switch
        _: "switch",
        1: "power" // On/Off Power Switch
    },
    17: { //Multilevel Switch
        _: "multilevel",
        6: "shutter" // Window Covering - Endpoint Aware
    }
}

export const ZWAVE_COMMAND_CLASS_PROPERTIES: Record<number, Record<string, ZWAVE_COMMAND_CLASS_PROPERTY>> = {
    37: { // Binary Switch
        targetValue: null,
        value: {
            set: "targetValue",
        },
        currentValue: {
            alias: "value",
            definition: {
                '@type': "onoff",
                type: "boolean",
                label: "Value",
                read_only: false
            }
        }
    },
    38: { // Multilevel Switch
        value: {
            set: "targetValue",
        },
        currentValue: {
            alias: "value",
            definition: {
                '@type': "level",
                label: "Value",
                read_only: false
            }
        },
        targetValue: null,
        Up: null,
        Down: null,
        restorePrevious: null
    },
    128: { // Battery
        level: {
            definition: {
                '@type': "battery"
            }
        }
    }
}

export const ZWAVE_SERVICE_PRIORITIES: {[commandClass: number]: number} = {
    128: 20, // Battery
    114: 15, // Manufacturer Specific
    134: 10 // Version
}

export const ZWAVE_SERVICE_GROUP: {[commandClass: number]: PropertyGroup} = {
    108: "internal", // Supervision
    112: "config", // Configuration
    114: "internal", // Manufacturer Specific
    117: "internal", // Protection
    134: "internal" // Version
}