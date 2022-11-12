import { Device, useStore } from "~~/stores/devices"

export const useDevice = (device: Device) => {
    const store = useStore()

    function property(type: string) {
        for (const serviceId of device.services) {
            if (store.services.has(serviceId))
                for (const [key, property] of Object.entries(store.services.get(serviceId)!.properties)) {
                    if (property['@type'] == type)
                        return [serviceId, key]
                }
        }
        return [null, null]
    }

    function value(type: string) {
        const [serviceId, key] = property(type)
        return store.services.get(serviceId!)?.values[key!]
    }

    function icon() {
        let types = new Set
        for (const serviceId of device.services)
            if (store.services.has(serviceId))
                for (const type of store.services.get(serviceId)!.types)
                    types.add(type)

        if (types.has("zone"))
            return "mdi-select-group"

        if (types.has("light")) {
            if (types.has("group"))
                return "mdi-lightbulb-group"

            return "mdi-lightbulb"
        }

        if (types.has("remote"))
            return "mdi-remote"

        if (types.has("motion"))
            return "mdi-motion-sensor"

        if (types.has("multilevel"))
            return "mdi-knob"

        if (types.has("switch"))
            return "mdi-toggle-switch"

        if (types.has("gateway"))
            return "mdi-lan"

        if (types.has("controller"))
            return "mdi-cog-box"

        if (types.has("api"))
            return "mdi-api"

        return 'mdi-gauge'
    }

    return {
        property,
        value,
        icon
    }
}
