import { Property } from "../shared/definitions"

interface UnifiServiceProperty {
    parse: (data: any) => any
    definition: Omit<Property, 'read_only'> | string
}

export const UNIFI_SERVICE_PROPERTIES: Record<string, UnifiServiceProperty> = {
    "rssi": {
        parse: (data: any) => data.rssi,
        definition: {
            label: "RSSI",
            type: "number"
        }
    },
    "hostname": {
        parse: (data: any) => data.hostname,
        definition: "name"
    },
    "ip": {
        parse: (data: any) => data.ip,
        definition: {
            label: "IP Address",
            type: "string",
            group: "meta",
            hide_null: true
        }
    },
    "mac": {
        parse: (data: any) => data.mac,
        definition: {
            label: "MAC Address",
            type: "string",
            group: "meta"
        }
    },
    "oui": {
        parse: (data: any) => data.oui,
        definition: {
            label: "Manufacturer",
            type: "string",
            group: "meta",
            hide_null: true
        }
    }
}
