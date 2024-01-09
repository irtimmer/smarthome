import { Service } from "../shared/service";
import Providers from "./providers";

import EventEmitter from "events";

export interface Device {
    services: Set<Service>
    identifiers: Set<string>
}

export default class Devices extends EventEmitter {
    #devices: Map<string, Device>
    #identifiers: Map<string, string>
    #services: WeakMap<Service, string>

    constructor(providers: Providers) {
        super()
        this.#devices = new Map
        this.#identifiers = new Map
        this.#services = new WeakMap
        providers.on("unregister", (service: Service) => {
            const key = this.#services.get(service)
            if (!key)
                return

            const device = this.#devices.get(key)!
            device.services.delete(service)
            if (device.services.size > 0)
                this.emit("update", key)
            else {
                device.identifiers.forEach(id => this.#identifiers.delete(id))
                this.emit("delete", key)
                this.#devices.delete(key)
            }
        })

        providers.on("identifier", (service: Service, type: string, id: string) => {
            const key = `${type}:${id}`
            if (this.#services.has(service)) {
                if (this.#identifiers.has(key)) {
                    if (this.#identifiers.get(key) != this.#services.get(service)) {
                        const oldDeviceKey = this.#services.get(service)!
                        const oldDevice = this.#devices.get(oldDeviceKey)!
                        const newDeviceKey = this.#identifiers.get(key)!
                        const newDevice = this.#devices.get(newDeviceKey)!

                        oldDevice.services.forEach(s => {
                            this.#services.set(s, newDeviceKey)
                            newDevice.services.add(s)
                        })

                        oldDevice.identifiers.forEach(id => {
                            this.#identifiers.set(id, newDeviceKey)
                            newDevice.identifiers.add(id)
                        })

                        this.#devices.delete(oldDeviceKey)
                        this.emit("delete", oldDeviceKey)
                        this.emit("update", newDeviceKey)
                    }
                } else {
                    const deviceKey = this.#services.get(service)!
                    this.#identifiers.set(key, deviceKey)
                    this.#devices.get(deviceKey)!.identifiers.add(key)
                    this.emit("update", deviceKey)
                }
            } else if (this.#identifiers.has(key)) {
                const deviceKey = this.#identifiers.get(key)!
                const device = this.#devices.get(deviceKey)!
                device.services.add(service)
                for (const identifier of service.identifiers)
                    device.identifiers.add(identifier)

                this.#services.set(service, deviceKey)
                this.emit("update", deviceKey)
            } else {
                this.#devices.set(key, {
                    services: new Set([service]),
                    identifiers: new Set(service.identifiers)
                })
                this.#identifiers.set(key, key)
                this.#services.set(service, key)
                this.emit("update", key)
            }
        })
    }

    get devices(): ReadonlyMap<string, Device> {
        return this.#devices
    }
}
