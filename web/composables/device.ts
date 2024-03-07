import { type Device, type Service, useStore } from "~~/stores/devices"

import { SECONDARY_PROPERTIES, type TypeIconMapping, TYPE_ICONS, MAIN_PROPERTIES } from "./device_constants"

export const useDevice = (device: Device) => {
    const store = useStore()

    const services = () => device.services.map((id): [string, Service] => [id, store.services.get(id)!]).filter(([_, s]) => s !== undefined)

    function property(type: string) {
        let properties = [];
        for (const serviceId of device.services) {
            if (!store.services.has(serviceId))
                continue

                for (const [key, property] of Object.entries(store.services.get(serviceId)!.properties)) {
                    if (property['@type'] == type)
                    properties.push([serviceId, key])
                }
        }
        return properties
    }

    function value(type: string) {
        const properties = property(type);
        let ret;
        for (const [serviceId, key] of properties) {
            const value = store.services.get(serviceId!)?.values[key!];
            if (Array.isArray(ret) && Array.isArray(value))
                ret = [...ret, ...value];
            else
                ret = value ?? ret;
        }
        return ret;
    }

    function name() {
        return value("name") ?? device.services.map(id => store.services.get(id)).find(s => s !== undefined && s.name)?.name
    }

    function main() {
        const types = new Set(device.services.flatMap(id => store.services.get(id)?.types ?? []))

        for (const {type, property: prop} of MAIN_PROPERTIES) {
            if (types.has(type))
                return property(prop)[0] ?? [null, null]
        }

        return [null, null]
    }

    function badge() {
        if (value("connected") === false)
            return { icon: 'mdi-connection', color: 'orange' }

        const battery = value('battery')
        if (battery !== undefined && battery < 10)
            return { icon: 'mdi-battery-low', color: 'orange' }

        if (value("playing"))
            return { icon: 'mdi-play', color: 'green' }

        if (value("active"))
            return { icon: 'mdi-cog', color: 'green' }

        if (value("presence") === true)
            return { color: 'green' }

        return null
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

    function secondaries() {
        return SECONDARY_PROPERTIES.map(x => property(x)).flat().filter(([_, d]) => d != null)
    }

    return {
        services,
        property,
        value,
        name,
        main,
        secondaries,
        icon,
        badge
    }
}
