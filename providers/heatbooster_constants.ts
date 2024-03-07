import { Property } from "../shared/definitions";

type HeatBoosterProperty = {
    parse: (data: any) => any,
    defenition: Omit<Property, 'read_only'>
}

export const HEATBOOSTER_PROPERTIES: { [type: string]: HeatBoosterProperty } = {
    T_AMB: {
        parse: (data: any) => data.T_AMB,
        defenition: {
            '@type': 'temperature',
            type: 'number',
            unit: "C",
            label: 'Room Temperature'
        }
    },
    T_IN: {
        parse: (data: any) => data.T_IN,
        defenition: {
            type: 'number',
            unit: "C",
            label: 'Inlet Temperature'
        }
    },
    T_OUT: {
        parse: (data: any) => data.T_OUT,
        defenition: {
            type: 'number',
            unit: "C",
            label: 'Outlet Temperature'
        }
    },
    T_DELTA: {
        parse: (data: any) => data.T_DELTA,
        defenition: {
            type: 'number',
            unit: "C",
            label: 'Delta Temperature'
        }
    },
    FAN_SPEED: {
        parse: (data: any) => data.FAN_SPEED,
        defenition: {
            type: 'number',
            unit: "%",
            label: 'Fan Speed'
        }
    },
    FW_VERSION: {
        parse: (data: any) => data.FW_VERSION,
        defenition: {
            type: 'string',
            label: 'Firmware Version',
            group: 'meta'
        }
    },
    T_CHIP: {
        parse: (data: any) => data.T_CHIP,
        defenition: {
            type: 'string',
            label: 'Chip Version',
            group: 'meta'
        }
    }
}
