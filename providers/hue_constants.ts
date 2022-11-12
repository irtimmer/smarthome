import { HueServiceType } from "./hue";

export const HUE_SERVICE_TYPES: { [type: string]: HueServiceType } = {
    device: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: {
                type: "string",
                label: "Name"
            }
        },
    },
    light: {
        on: {
            parse: (data: any) => data.on?.on,
            definition: {
                type: "boolean",
                label: "On/off"
            }
        }
    }
}
