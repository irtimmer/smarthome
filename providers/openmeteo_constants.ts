import { Property } from "../shared/definitions";

type OpenMeteoProperty = {
    parse: (data: any) => any,
    defenition: Omit<Property, 'read_only'>
}

export const OPENMETEO_PROPERTIES: { [type: string]: OpenMeteoProperty } = {
    temperature: {
        parse: (data: any) => data.current_weather?.temperature,
        defenition: {
            '@type': 'temperature',
            type: 'number',
            unit: "C",
            label: 'Temperature'
        }
    },
    windspeed: {
        parse: (data: any) => data.current_weather?.windspeed,
        defenition: {
            type: 'number',
            unit: "kmh",
            label: 'Wind speed'
        }
    },
    winddirection: {
        parse: (data: any) => data.current_weather?.winddirection,
        defenition: {
            type: 'number',
            label: 'Wind direction'
        }
    },
    weathercode: {
        parse: (data: any) => data.current_weather?.weathercode,
        defenition: {
            type: 'number',
            label: 'Weather code'
        }
    }
}
