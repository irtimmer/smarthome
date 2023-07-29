import { Action, Property } from "../shared/definitions"

interface PhilipsTVProperty {
    parse: (data: any) => any
    set?: (value: any) => any
    definition: Omit<Property, 'read_only'>
}

interface PhilipsTVAction {
    trigger: (data: any) => any
    definition: Action
}

export const PHILIPS_TV_PROPERTIES: Record<string, Record<string, PhilipsTVProperty>> = {
    'system': {
        name: {
            parse: (data: any) => data.name,
            definition: {
                '@type': 'name',
                type: "string",
                label: "Name",
                group: "internal"
            }
        }
    },
    'powerstate': {
        on: {
            parse: (data: any) => data.powerstate == 'On',
            definition: {
                '@type': 'onoff',
                type: "boolean",
                label: "Power"
            }
        }
    },
    'audio/volume': {
        muted: {
            parse: (data: any) => data.muted,
            set: (muted: any) => ({ muted }),
            definition: {
                '@type': 'muted',
                type: "boolean",
                label: "Muted"
            }
        },
        volume: {
            parse: (data: any) => data.current,
            set: (current: any) => ({ current }),
            definition: {
                '@type': 'volume',
                type: "number",
                label: "Volume"
            }
        }
    },
    'ambilight/power': {
        on: {
            parse: (data: any) => data.power == 'On',
            set: (value: any) => ({
                power: value ? 'On' : 'Off'
            }),
            definition: {
                '@type': 'onoff',
                type: "boolean",
                label: "Ambilight"
            }
        }
    },
    'HueLamp/power': {
        on: {
            parse: (data: any) => data.power == 'On',
            set: (value: any) => ({
                power: value ? 'On' : 'Off'
            }),
            definition: {
                '@type': 'onoff',
                type: "boolean",
                label: "Ambilight Hue"
            }
        }
    },
    'activities/current': {
        packageName: {
            parse: (data: any) => data.component?.packageName,
            definition: {
                type: "string",
                label: "Package Name"
            }
        },
        className: {
            parse: (data: any) => data.component?.className,
            definition: {
                type: "string",
                label: "Class Name"
            }
        }
    },
    "ambilight/currentconfiguration": {
        styleName: {
            parse: (data: any) => data.styleName,
            set: (value: any) => ({
                styleName: value,
                isExpert: false,
                menuSetting: "IMMERSIVE"
            }),
            definition: {
                type: "enum",
                label: "Style",
                options: {
                    OFF: 'Off',
                    FOLLOW_AUDIO: 'Follow audio',
                    FOLLOW_VIDEO: 'Follow video',
                    FOLLOW_COLOR: 'Follow color'
                }
            }
        }
    }
}

export const PHILIPS_TV_ACTIONS: Record<string, Record<string, PhilipsTVAction>> = {
    'input/key': {
        key: {
            trigger: (key: any) => ({ key }),
            definition: {
                label: "Key"
            }
        }
    }
}
