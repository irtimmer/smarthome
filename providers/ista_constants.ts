import { Property } from "../shared/definitions"

interface IstaServiceProperty {
    parse: (data: any) => any
    definition: Omit<Property, 'read_only'> | string
}

export const ISTA_SERVICE_PROPERTIES: Record<string, IstaServiceProperty> = {
    "MeterNr": {
        parse: (data: any) => data.MeterNr,
        definition: {
            type: "string",
            label: "Meter Nr."
        }
    },
    "EndValue": {
        parse: (data: any) => data.EndValue,
        definition: {
            '@type': "level",
            type: "number",
            label: "Value"
        }
    },
    "CalcFactor": {
        parse: (data: any) => data.CalcFactor,
        definition: {
            type: "number",
            label: "Calculation Factor"
        }
    },
    "Position": {
        parse: (data: any) => data.Position,
        definition: {
            type: "string",
            label: "Position"
        }
    },
    "EsDate": {
        parse: (data: any) => data.EsDate,
        definition: {
            type: "string",
            label: "Date"
        }
    },
}