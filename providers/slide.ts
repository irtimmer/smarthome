import { HttpClient, RequestOptions } from 'urllib'

import { Property } from "../shared/definitions"
import Provider, { ProviderManager } from "../shared/provider";
import Service from "../shared/service";
import Poll from "../shared/utils/poll";

import { SLIDE_PROPERTIES } from "./slide_constants";

export interface SlideProperty {
    url?: string
    parse: (data: any) => any
    definition: Omit<Property, 'read_only'> & {
        read_only?: boolean
    } | string
}

interface SlideConfig {
    host: string
    device_code: string
}

export default class SlideProvider extends Provider<Slide> {
    #config: SlideConfig
    #client: HttpClient

    constructor(manager: ProviderManager, config: SlideConfig) {
        super(manager)
        this.#config = config
        this.#client = new HttpClient

        this.registerTask('poll', new Poll(async () => {
            const req = await this.request('Slide.GetInfo')
            const data = req.data

            const id = data.slide_id.substring(6).toLowerCase()
            const device = this.services.get(id) ?? this.registerService(new Slide(this, id))
            device.refresh(data)
        }, {
            interval: 60,
            retryInterval: 60,
            maxRetries: 4
        }))
    }

    request(path: string, options?: Partial<RequestOptions>) {
        return this.#client.request(`http://${this.#config.host}/rpc/${path}`, {...{
            digestAuth: `user:${this.#config.device_code}`,
            contentType: 'json',
            dataType: 'json',
            method: 'POST'
        }, ...options})
    }
}

class Slide extends Service<SlideProvider> {
     constructor(provider: SlideProvider, id: string) {
        super(provider, id)
        this.name = 'Slide'

        this.registerIdentifier('mac', id)
        this.updateTypes(["window", "multilevel"])
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
            await this.provider.request(`${SLIDE_PROPERTIES[key].url}`, {
                data: {
                    [key]: value
                }
            })
        } else
            return Promise.reject("Unsupported key")
    }
}
