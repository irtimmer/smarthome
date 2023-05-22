import { Property } from "../shared/definitions"

type ZWAVE_COMMAND_CLASS_PROPERTY = {
    alias?: string
    set?: string
    definition?: Partial<Property>
} | null

export const ZWAVE_DEVICE_CLASS_TYPES: Record<number, Record<number | '_', string>> = {
    16: { // Binary Switch
        _: "switch",
        1: "power" // On/Off Power Switch
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
    128: { // Battery
        level: {
            definition: {
                '@type': "battery"
            }
        }
    }
}
