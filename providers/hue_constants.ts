import { HueServiceType } from "./hue";

export const HUE_SERVICE_TYPE: { [type: string]: string | string[] } = {
    light: "light",
    grouped_light: ["group", "light"],
    room: ["room", "group"],
    zone: ["zone", "group"],
}

export const HUE_SERVICE_TYPES: { [type: string]: HueServiceType } = {
    room: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: {
                '@type': 'name',
                type: "string",
                label: "Name"
            }
        },
        archetype: {
            parse: (data: any) => data.metadata?.archetype,
            definition: {
                type: "string",
                label: "Archetype",
            }
        }
    },
    scene: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: {
                type: "string",
                label: "Name",
            }
        }
    },
    zone: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: {
                '@type': 'name',
                type: "string",
                label: "Name"
            }
        },
        archetype: {
            parse: (data: any) => data.metadata?.archetype,
            definition: {
                type: "string",
                label: "Archetype"
            }
        }
    },
    device: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: {
                '@type': 'name',
                type: "string",
                label: "Name"
            }
        },
        productname: {
            parse: (data: any) => data.product_data?.product_name,
            definition: {
                type: "string",
                label: "Product Name"
            }
        },
        archetype: {
            parse: (data: any) => data.product_data?.product_archetype,
            definition: {
                type: "string",
                label: "Archetype"
            }
        }
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
        },
        brightness: {
            parse: (data: any) => data.dimming?.brightness,
            set: (value: any) => ({ dimming: { brightness: value }}),
            definition: {
                type: "number",
                label: "Brightness"
            }
        }
    },
    grouped_light: {
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
