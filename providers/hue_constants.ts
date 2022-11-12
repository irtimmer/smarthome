import { HueServiceType } from "./hue";

export const HUE_SERVICE_TYPE: { [type: string]: string | string[] } = {
    light: "light",
    grouped_light: ["group", "light"],
    button: "remote",
    room: ["room", "group"],
    zone: ["zone", "group"],
    motion: ["motion", "presence"],
    temperature: ["temperatureSensor"],
    light_level: ["lightSensor"],
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
    temperature: {
        temperature: {
            parse: (data: any) => data.temperature?.temperature,
            definition: {
                '@type': "temperature",
                type: "number",
                label: "Temperature"
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
    },    
    motion: {
        motion: {
            parse: (data: any) => data.motion?.motion,
            definition: {
                '@type': "presence",
                type: "boolean",
                label: "Motion"
            }
        }
    },
    light_level: {
        lightlevel: {
            parse: (data: any) => data.light?.light_level,
            definition: {
                type: "number",
                label: "Lightlevel"
            }
        }
    },
    button: {
        event: {
            parse: (data: any) => data.button?.last_event,
            definition: {
                type: "string",
                label: "Event"
            }
        }
    }
}
