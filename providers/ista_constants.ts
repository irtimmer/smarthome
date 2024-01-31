import { Property } from "../shared/definitions"

interface IstaServiceProperty {
    parse: (data: any) => any
    definition: Omit<Property, 'read_only'> | ((data: any, billing: any) => Omit<Property, 'read_only'>) | string
}

export const ISTA_SERVICE_PROPERTIES: Record<string, IstaServiceProperty> = {
    "MeterNr": {
        parse: (data: any) => data.MeterNr,
        definition: {
            type: "string",
            label: "Meter Nr."
        }
    },
    "MeterId": {
        parse: (data: any) => data.MeterId,
        definition: {
            type: "string",
            label: "Meter ID"
        }
    },
    "EndValue": {
        parse: (data: any) => data.CalcFactor > 0 ? data.EndValue * data.CalcFactor : data.EndValue,
        definition: (_, billing: any) => ({
            '@type': "level",
            type: "number",
            unit: billing["Unit"],
            label: "Value"
        })
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
        parse: (data: any) => new Date(data.EsDate.split("-").reverse().join("-")).getTime() / 1000,
        definition: {
            type: "string",
            label: "Date"
        }
    },
}