import { GenesisProperty } from "./hue_genesis";

export const GENESIS_PROPERTIES: { [key: string]: GenesisProperty } = {
    brightness: {
        parse: (data: any) => data.brightness,
        set: (value: any) => ({ brightness: value }),
        definition: {
            '@type': 'brightness',
            type: "number",
            label: "Brightness",
            min: 0,
            max: 100
        }
    },
    light_delay: {
        parse: (data: any) => data.light_delay,
        set: (value: any) => ({ light_delay: value }),
        definition: {
            type: "number",
            label: "Light Delay",
            min: 0,
            max: 1000
        }
    },
    sync_status: {
        parse: (data: any) => data.sync_status == "start",
        set: (value: any) => ({ sync_status: value ? "start" : "stop" }),
        definition: {
            type: "boolean",
            label: "Sync Status",
        }
    },
    entertainment_id: {
        parse: (data: any) => data.entertainment_id,
        definition: {
            type: "string",
            label: "Entertainment Zone",
        }
    }
}
