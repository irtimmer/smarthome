import { Property } from "../shared/definitions"
import Provider from "../shared/provider";
import Service from "../shared/service";
import Poll from "../shared/utils/poll";

import { SLIDE_PROPERTIES } from "./slide_constants";

const SLIDE_URL = 'https://api.goslide.io/api';

export interface SlideProperty {
    url?: string
    parse: (data: any) => any
    definition: Omit<Property, 'read_only'> & {
        read_only?: boolean
    } | string
}

interface SlideConfig {
    email: string
    password: string
}

export default class SlideProvider extends Provider<Slide> {
    #config: SlideConfig
    #token_expiration: number
    #token?: {
        token_type: string
        access_token: string
        expires_in: number
    }

    constructor(id: string, config: SlideConfig) {
        super(id)
        this.#config = config
        this.#token_expiration = 0

        new Poll(async () => {
            const token = await this.getToken()
            const req = await fetch(`${SLIDE_URL}/slides/overview`, {
                headers: {
                    'Authorization': `${token.token_type} ${token.access_token}`
                }
            })
            const data = await req.json()
            for (const slide of data.slides) {
                const id = slide.device_id.substring(6)
                let device = this.services.get(id)
                if (!device) {
                    device = new Slide(this, id, slide.id)
                    this.registerService(device)
                    device.registerIdentifier('slide', id)
                }
                device.refresh(slide)
            }
        })
    }

    async getToken() {
        if (this.#token == null || Date.now() > this.#token_expiration) {
            const req = await fetch(`${SLIDE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.#config)
            })
            this.#token = await req.json()
            this.#token_expiration = Date.now() + (this.#token!.expires_in * 1000) / 2
        }

        return this.#token!
    }
}

class Slide extends Service<SlideProvider> {
    readonly #internalId: number

    constructor(provider: SlideProvider, id: string, internalId: number) {
        super(provider, id)
        this.#internalId = internalId
        this.name = 'Slide'

        this.registerType("window")
        this.registerType("multilevel")
        for (const [key, property] of Object.entries(SLIDE_PROPERTIES))
            this.registerProperty(key, typeof property.definition == "string" ? property.definition : { ...property.definition, ...{
                read_only: !('url' in property)
            }});
    }

    refresh(data: any) {
        for (const [key, property] of Object.entries(SLIDE_PROPERTIES))
            this.updateValue(key, property.parse(data))
    }

    async setValue(key: string, value: any) {
        if ('url' in SLIDE_PROPERTIES[key]) {
            const token = await this.provider.getToken()
            return fetch(`${SLIDE_URL}/slide/${this.#internalId}/${SLIDE_PROPERTIES[key].url}`, {
                method: 'POST',
                headers: {
                    'Authorization': `${token.token_type} ${token.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    [key]: value
                })
            }).then(async (x: any) => {
                console.log(await x.json())
            })
        }
        return Promise.reject("Unsupported key")
    }
}