import WebSocket from "ws";

import Provider from "../shared/provider";
import AbstractService from "../shared/service";
import { Property } from "../shared/definitions";

import Poll, { Retry } from "../shared/utils/poll";
import Store from "../shared/store";

import { GENESIS_PROPERTIES } from "./hue_genesis_constants";

export interface GenesisProperty {
    parse: (data: any) => any
    set?: (value: any) => any
    definition: Omit<Property, 'read_only'> | string
}

// To get access to the Genesis API,
// you need the client_id and client_secret from the official Hue app.
type GenesisOptions = {
    client_id: string
    client_secret: string
}

export default class GenesisProvider extends Provider<GenesisService> {
    #options: GenesisOptions
    #storage: Store

    constructor(id: string, options: GenesisOptions, storage: Store) {
        super(id);
        this.#options = options;
        this.#storage = storage;

        new Poll(async () => {
            let access_token = await this.getAccessToken(undefined)
            let ret = await fetch("https://api.meethue.com/genesis/api/discover/authentication", {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            })

            let data: any = await ret.json()
            if (!data.users)
                throw new Error("No Genesis users")

            for (const user of data.users) {
                const id = user.uuid
                this.services.get(id) ?? this.registerService(new GenesisService(this, id))
            }
        }, {
            interval: 60 * 60,
            retryInterval: 60,
        })
    }

    async getAccessToken(refresh_token: string | undefined): Promise<string> {
        let access_token = this.#storage.get("access_token")
        let access_token_expiration = this.#storage.get("access_token_expiration")
        if (access_token && access_token_expiration && access_token_expiration > Date.now() / 1000)
            return access_token

        if (!refresh_token)
            refresh_token = this.#storage.get("refresh_token")

        let ret = await fetch("https://api.meethue.com/v2/oauth2/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(`${this.#options.client_id}:${this.#options.client_secret}`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `grant_type=refresh_token&refresh_token=${refresh_token}`
        })

        let data: any = await ret.json()
        if (data.refresh_token)
            this.#storage.set("next_refresh_token", data.refresh_token)

        if (!data.access_token) {
            // If we have a newer refresh token, try again
            let next_refresh_token = this.#storage.get("next_refresh_token")
            if (!next_refresh_token || refresh_token == next_refresh_token)
                throw new Error("No access token")

            return this.getAccessToken(next_refresh_token)
        }

        this.#storage.set("access_token", data.access_token)
        this.#storage.set("access_token_expiration", (Date.now() / 1000) + data.expires_in / 2)
        this.#storage.set("refresh_token", refresh_token)
        return data.access_token
    }
}

class GenesisService extends AbstractService<GenesisProvider> {
    #socket?: WebSocket
    #reconnect: Retry

    constructor(provider: GenesisProvider, id: string) {
        super(provider, id)
        this.name = "Hue Genesis"

        this.registerIdentifier("uuid", id);
        for (const [key, property] of Object.entries(GENESIS_PROPERTIES)) {
            this.registerProperty(key, typeof property.definition === "string" ? property.definition : { ...property.definition, ...{
                read_only: !('set' in property)
            }})
        }

        this.#reconnect = new Retry(this.#connect.bind(this), {
            interval: 60 * 1000,
            retryInterval: 10 * 1000,
            maxRetries: 5
        })
    }

    async #connect() {
        const access_token = await this.provider.getAccessToken(undefined)

        this.#socket = new WebSocket("wss://genesis-ws.meethue.com/", {
            headers: {
                auth: access_token,
                "x-genesis-uuid": this.id
            }
        });

        this.#socket.on("close", e => {
            this.#socket = undefined;
            this.#reconnect.retry(e)
        });

        this.#socket.on("error", e => {
            this.#socket!.close()
            this.#socket = undefined;

            this.#reconnect.retry(e)
        })

        this.#socket.on("message", e => {
            const json = JSON.parse(e.toString())
            if (json.type == 'control') {
                this.#reconnect.succeeded()
                Object.entries(GENESIS_PROPERTIES).forEach(([key, property]) => this.updateValue(key, property.parse(json.data)))
            }
        });
    }

    async setValue(key: string, value: any) {
        if (!this.#socket)
            throw new Error("No socket")

        const property = GENESIS_PROPERTIES[key]
        if (!property.set)
            throw new Error("Property is read-only")

        this.#socket.send(JSON.stringify({
            type: "control",
            data: property.set(value)
        }))
    }
}
