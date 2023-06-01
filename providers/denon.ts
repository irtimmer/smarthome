import { Socket } from "net";

import Provider from "../shared/provider";
import Service from "../shared/service";

import { DENON_PROPERTIES } from "./denon_constants";

interface DenonConfig {
    host: string
}

export default class DenonProvider extends Provider<DenonService> {
    readonly host: string

    constructor(id: string, config: DenonConfig) {
        super(id)
        this.host = config.host

        setInterval(this.#scan.bind(this), 10000)
    }

    #scan() {
        let service = this.services.get(this.id)
        if (!service) {
            service = new DenonService(this, this.id)
            this.registerService(service)
        }
    }
}

class DenonService extends Service<DenonProvider> {
    #socket: Socket

    constructor(provider: DenonProvider, id: string) {
        super(provider, id)
        this.registerIdentifier("provider", this.id)

        this.#socket = new Socket();
        this.#socket.connect(23, provider.host);
        this.#socket.on('data', this.#onData.bind(this));
        this.#socket.on('connect', async () => {
            if (this.#socket.remoteAddress)
                this.registerIdentifier('ip', this.#socket.remoteAddress);

            this.requestInfo()
        });

        for (const [key, property] of Object.entries(DENON_PROPERTIES)) {
            if (!property)
                continue

            this.registerProperty(key, {...property.definition, ...{
                read_only: property.set === undefined
            }})
        }
    }

    #onData(buffer: Buffer) {
        const data = buffer.toString().trim();
        const key = Object.keys(DENON_PROPERTIES).find(key => data.startsWith(key))
        if (!key)
            return

        const property = DENON_PROPERTIES[key]
        if (!property)
            return

        this.updateValue(key, property.parse(data.substring(key.length)))
    }

    async requestInfo() {
        for (let property of Object.values(DENON_PROPERTIES)) {
            if (!property?.request)
                continue

            this.#socket.write(property.request + "\r");
            await new Promise(r => setTimeout(r, 500));
        }
    }

    setValue(key: string, value: any): Promise<void> {
        const property = DENON_PROPERTIES[key]
        if (!property || !property.set)
            return Promise.reject()

        this.#socket.write(property.set(value) + "\r");
        return Promise.resolve()
    }
}
