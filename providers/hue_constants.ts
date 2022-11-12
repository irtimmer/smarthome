import { HueServiceType } from "./hue";

export const HUE_SERVICE_TYPE: { [type: string]: string | string[] } = {
    light: "light",
}

export const HUE_SERVICE_TYPES: { [type: string]: HueServiceType } = {
    device: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: {
                '@type': 'name',
                type: "string",
                label: "Name"
            }
        },
    },
    light: {
        on: {
            parse: (data: any) => data.on?.on,
            set: (value: any) => ({ on: { on: value }}),
            definition: {
                '@type': "onoff",
                type: "boolean",
                label: "On/off"
            }
        }
    }
}
