import { Device, useStore } from "~~/stores/devices"

import { TypeIconMapping, TYPE_ICONS } from "./device_constants"

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
        const icon = value("icon")
        if (icon)
            return icon

        const types = new Set(device.services.flatMap(id => store.services.get(id)?.types ?? []))
        const findIcon = (mapping: TypeIconMapping): string => {
            const icon = Object.entries(mapping).find(([type, _]) => types.has(type))
            return icon ? (typeof icon[1] === "object" ? findIcon(icon[1]) : icon[1]) : mapping['_default']
        }

        return findIcon(TYPE_ICONS)
    }

    return {
        property,
        value,
        icon
    }
}
