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

        return 'mdi-gauge'
    }

    return {
        property,
        value,
        icon
    }
}
