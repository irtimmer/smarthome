import { Property } from "./definitions";

export const SERVICE_PROPERTIES: { [type: string]: Omit<Property, '@type'> } = {
    name: {
        label: "Name",
        type: "string",
        read_only: true,
        group: "meta"
    },
    icon: {
        label: "Icon",
        type: "string",
        read_only: true,
        group: "internal"
    },
    connected: {
        label: "Connected",
        type: "boolean",
        read_only: true,
        group: "internal"
    },
    battery: {
        type: "number",
        unit: "%",
        label: "Battery",
        read_only: true
    }
}
