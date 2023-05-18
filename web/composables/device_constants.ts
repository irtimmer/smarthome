export type TypeIconMapping = { _default: string, [type: string]: string | TypeIconMapping }

export const MAIN_PROPERTIES: { type: string, property: string }[] = [
    { type: "switch", property: "onoff" }
]

export const TYPE_ICONS: TypeIconMapping = {
    _default: "mdi-gauge",
    "zone": "mdi-select-group",
    "light": {
        _default: "mdi-lightbulb",
        "group": "mdi-lightbulb-group"
    },
    "remote": "mdi-remote",
    "motion": "mdi-motion-sensor",
    "presence": "mdi-location-enter",
    "switch": "mdi-toggle-switch",
    "gateway": "mdi-lan",
    "controller": "mdi-cog-box",
    "api": "mdi-api",
    "weather": "mdi-weather-partly-cloudy",
    "sun": "mdi-weather-sunny"
}
