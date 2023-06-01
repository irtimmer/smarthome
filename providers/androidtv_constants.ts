import { Property } from "../shared/definitions"

export interface AndroidTVProperty {
    parse: (data: any) => any
    definition: Omit<Property, 'read_only'>
}

export const ANDROIDTV_PROPERTIES: Record<string, Record<string, AndroidTVProperty>> = {
    remoteStart: {
        started: {
            parse: (data: any) => data.started,
            definition: {
                type: "boolean",
                label: "Started",
            }
        }
    },
    remoteConfigure: {
        model: {
            parse: (data: any) => data.deviceInfo?.model,
            definition: {
                type: "string",
                label: "Model",
                group: "meta"
            }
        },
        vendor: {
            parse: (data: any) => data.deviceInfo?.vendor,
            definition: {
                type: "string",
                label: "Vendor",
                group: "meta"
            }
        }
    },
    remoteImeKeyInject: {
        appPackage: {
            parse: data => data.appInfo.appPackage,
            definition: {
                type: "string",
                label: "Package Name"
            }
        }
    },
    remoteSetVolumeLevel: {
        volumeLevel: {
            parse: (data: any) => data.volumeLevel,
            definition: {
                type: 'number',
                label: 'Volume'
            }
        },
    }
}
