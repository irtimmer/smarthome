import { HueServiceType } from "./hue";

export const HUE_SERVICE_TYPES: { [type: string]: HueServiceType } = {
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
