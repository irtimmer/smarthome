import { Property } from "../shared/definitions"

type DENON_PROPERTY = {
    parse: (data: string) => any
    set?: (val: any) => string
    request?: string
    definition: Omit<Property, 'read_only'>
}

const channelVolume = (key: string, name: string, request?: boolean) => ({
    request: request ? 'CV?' : undefined,
    parse: data => parseInt(data),
    set: val => `{key} ${Math.floor(val)}`,
    definition: {
        type: 'number',
        label: name,
        min: 38,
        max: 62
    }
}) as DENON_PROPERTY

export const DENON_PROPERTIES: Record<string, DENON_PROPERTY | undefined> = {
    NSFRN: {
        request: 'NSFRN ?',
        parse: data => data.substring(1),
        definition: {
            '@type': "name",
            type: "string",
            label: "Name"
        }
    },
    PW: {
        request: 'PW?',
        parse: data => data == 'ON',
        set: val => val ? 'PWON' : 'PWSTANDBY',
        definition: {
            '@type': "onoff",
            type: "boolean",
            label: "On"
        }
    },
    MVMAX: undefined,
    MV: {
        request: 'MV?',
        parse: data => data.length == 3 ? parseInt(data) / 10 : parseInt(data),
        set: val => `MV${Math.floor(val)}`,
        definition: {
            '@type': "volume",
            type: 'number',
            label: 'Master Volume',
            min: 0,
            max: 98
        }
    },
    MU: {
        request: 'MU?',
        parse: data => data == 'ON',
        set: val => val ? 'MUON' : 'MUOFF',
        definition: {
            type: "boolean",
            label: "Mute"
        }
    },
    SI: {
        request: 'SI?',
        parse: data => data,
        set: val => `SI${val}`,
        definition: {
            type: 'enum',
            label: 'Input',
            options: {
                PHONO: 'Phono',
                CD: 'CD',
                DVD: 'DVD',
                BD: 'Blu-ray',
                TV: 'Television',
                'SAT/CBL': 'Satetelite/Cable',
                MPLAY: 'Media Player',
                GAME: 'Game',
                TUNER: 'Tuner',
                AUX1: 'AUX1',
                AUX2: 'AUX2',
                NET: 'Network',
                BT: 'Bluetooth'
            }
        }
    },
    CVFL: channelVolume('CVFL', 'Channel Volume Front Left', true),
    CVFR: channelVolume('CVFR', 'Channel Volume Front Right'),
    CVC: channelVolume('CVC', 'Channel Volume Center'),
    CVSW: channelVolume('CVSW', 'Channel Volume Sub Woofer'),
    CVSL: channelVolume('CVSL', 'Channel Volume Surround Left'),
    CVSR: channelVolume('CVSR', 'Channel Volume Surround Right'),
    CVSBL: channelVolume('CVSBL', 'Channel Volume Surround Back Left'),
    CVSBR: channelVolume('CVSBR', 'Channel Volume Surround Back Right'),
    CVFHL: channelVolume('CVFHL', 'Channel Volume Front Height Left'),
    CVFHR: channelVolume('CVFHR', 'Channel Volume Front Height Right'),
    CVTFL: channelVolume('CVTFL', 'Channel Volume Top Front Left'),
    CVTFR: channelVolume('CVTFR', 'Channel Volume Top Front Right'),
    CVTML: channelVolume('CVTML', 'Channel Volume Top Middle Left'),
    CVTMR: channelVolume('CVTMR', 'Channel Volume Top Middle Right'),
    CVFDL: channelVolume('CVFDL', 'Channel Volume Front Dolby Left'),
    CVFDR: channelVolume('CVFDR', 'Channel Volume Front Dolby Right'),
    CVSDL: channelVolume('CVSDL', 'Channel Volume Surround Dolby Left'),
    CVSDR: channelVolume('CVSDR', 'Channel Volume Surround Dolby Right')
}
