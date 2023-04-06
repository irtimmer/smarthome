import { Service } from "../shared/service";
import Providers from "./providers";

interface Device {
    services: Set<Service>
    identifiers: Set<string>
}

export default class Devices {
    #devices: Map<string, Device>
    #identifiers: Map<string, string>
    #services: WeakMap<Service, string>

    constructor(providers: Providers) {
        this.#devices = new Map
        this.#identifiers = new Map
        this.#services = new WeakMap
        providers.on("identifier", (service: Service, type: string, id: string) => {
            const key = `${type}:${id}`
            if (this.#services.has(service)) {
                if (this.#identifiers.has(key)) {
                    if (this.#identifiers.get(key) != this.#services.get(service)) {
                        // TODO merge devices
                    }
                } else {
                    this.#identifiers.set(key, this.#services.get(service)!)
                    this.#devices.get(this.#services.get(service)!)!.identifiers.add(key)
                }
            } else if (this.#identifiers.has(key)) {
                const deviceKey = this.#identifiers.get(key)!
                const device = this.#devices.get(deviceKey)!
                device.services.add(service)
                for (const identifier of service.identifiers)
                    device.identifiers.add(identifier)

                this.#services.set(service, deviceKey)
            } else {
                this.#devices.set(key, {
                    services: new Set([service]),
                    identifiers: new Set(service.identifiers)
                })
                this.#identifiers.set(key, key)
                this.#services.set(service, key)
            }
        })
    }

    get devices(): ReadonlyMap<string, Device> {
        return this.#devices
    }
}
