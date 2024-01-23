export type TypeIconMapping = { _default: string, [type: string]: string | TypeIconMapping }

export const MAIN_PROPERTIES: { type: string, property: string }[] = [
    { type: "switch", property: "onoff" },
    { type: "temperatureSensor", property: "temperature" },
    { type: "sensor", property: "level" }
]

export const TYPE_ICONS: TypeIconMapping = {
    _default: "mdi-gauge",
    "endpoint": "mdi-devices",
    "home": "mdi-home",
    "user": "mdi-account",
    "zone": "mdi-select-group",
    "light": {
        _default: "mdi-lightbulb",
        "group": "mdi-lightbulb-group"
    },
    "television": "mdi-television",
    "remote": "mdi-remote",
    "window": "mdi-curtains",
    "shutter": "mdi-window-shutter",
    "hvac": "mdi-hvac",
    "power": "mdi-power-socket",
    "motion": "mdi-motion-sensor",
    "thermostat": "mdi-thermostat",
    "presence": "mdi-location-enter",
    "multilevel": "mdi-knob",
    "switch": "mdi-toggle-switch",
    "gateway": "mdi-lan",
    "controller": "mdi-cog-box",
    "api": "mdi-api",
    "weather": "mdi-weather-partly-cloudy",
    "sun": "mdi-weather-sunny"
}
