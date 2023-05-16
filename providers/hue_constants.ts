import { HueServiceActionType, HueServiceType } from "./hue";

export const HUE_SERVICE_TYPE: { [type: string]: string | string[] } = {
    light: "light",
    grouped_light: ["group", "light"],
    button: "remote",
    room: ["room", "group"],
    zone: ["zone", "group"],
    motion: ["motion", "presence"],
    temperature: ["temperatureSensor"],
    light_level: ["lightSensor"],
    behavior_script: "controller",
    bridge: "gateway",
    homekit: "api",
    geolocation: "api",
    entertainment_configuration: "zone"
}

export const HUE_SERVICE_PRIORITIES: { [type: string]: number } = {
    motion: 70,
    temperature: 65,
    light_level: 60,
    light: 50,
    grouped_light: 50,
    smart_scene: 45,
    scene: 40,
    button: 30,
    device_power: 20,
    entertainment_configucation: 10,
    geofence_client: 10,
    behaviour_script: 10,
    bridge: 10,
    homekit: 10,
    matter: 10,
    geolocation: 10,
    room: 10,
    zone: 10
}

export const HUE_SERVICE_TYPES: { [type: string]: HueServiceType } = {
    room: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: "name"
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
    behavior_script: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: {
                '@type': 'name',
                type: "string",
                label: "Name"
            }
        }
    },
    zone: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: "name"
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
            definition: "name"
        },
        modelid: {
            parse: (data: any) => data.product_data?.model_id,
            definition: {
                type: "string",
                label: "Model Id",
                group: "meta"
            }
        },
        manufacturername: {
            parse: (data: any) => data.product_data?.manufacturer_name,
            definition: {
                type: "string",
                label: "Manufacturer Name",
                group: "meta"
            }
        },
        productname: {
            parse: (data: any) => data.product_data?.product_name,
            definition: {
                type: "string",
                label: "Product Name",
                group: "meta"
            }
        },
        archetype: {
            parse: (data: any) => data.product_data?.product_archetype,
            definition: {
                type: "string",
                label: "Archetype",
                group: "meta"
            }
        },
        softwareversion: {
            parse: (data: any) => data.product_data?.software_version,
            definition: {
                type: "string",
                label: "Software Version",
                group: "meta"
            }
        },
        hardwareplatformtype: {
            parse: (data: any) => data.product_data?.hardware_platform_type,
            definition: {
                type: "string",
                label: "Hardware Type",
                group: "meta"
            }
        },
        certified: {
            parse: (data: any) => data.product_data?.certified,
            definition: {
                type: "boolean",
                label: "Certified",
                group: "meta"
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
                label: "Brightness",
                min: 0,
                max: 100
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
    },
    geofence_client: {
        name: {
            parse: (data: any) => data.name,
            definition: "name"
        },
    },
    entertainment_configuration: {
        name: {
            parse: (data: any) => data.metadata?.name,
            definition: "name"
        },
    }
}

export const HUE_SERVICE_ACTIONS: { [type: string]: HueServiceActionType } = {
    scene: {
        activate: {
            trigger: props => ({
                recall: {
                    action: "active"
                }
            }),
            definition: {
                label: "Activate"
            }
        }
    }
}
