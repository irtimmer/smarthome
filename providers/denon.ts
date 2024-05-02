import { Socket } from "net";

import Provider from "../shared/provider";
import Service from "../shared/service";

import { DENON_PROPERTIES } from "./denon_constants";

import { Retry } from "../shared/utils/poll";

interface DenonConfig {
    host: string
}

export default class DenonProvider extends Provider<DenonService> {
    readonly host: string

    constructor(id: string, config: DenonConfig) {
        super(id)
        this.host = config.host

        this.registerService(new DenonService(this, this.id))
    }
}

class DenonService extends Service<DenonProvider> {
    #socket: Socket
    #reconnect: Retry
    #lastError?: Error

    constructor(provider: DenonProvider, id: string) {
        super(provider, id)
        this.registerIdentifier("provider", this.id)
        this.name = "Denon AVR"

        this.#socket = new Socket();
        this.#reconnect = new Retry(() => {
            this.#socket.connect(23, this.provider.host)
            return Promise.resolve()
        })
        this.provider.registerTask(`reconnect-${id}`, this.#reconnect)

        this.#socket.on('close', hasError => this.#reconnect.retry(hasError ? this.#lastError : undefined))
        this.#socket.on('error', e => this.#lastError = e)
        this.#socket.on('data', this.#onData.bind(this));
        this.#socket.on('connect', async () => {
            this.#reconnect.succeeded()
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

    async setValue(key: string, value: any) {
        const property = DENON_PROPERTIES[key]
        if (!property || !property.set)
            throw new Error("Property is not found or read-only")

        this.#socket.write(property.set(value) + "\r");
    }
}
