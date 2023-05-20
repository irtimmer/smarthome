import Provider from "../shared/provider";
import Service from "../shared/service";
import Poll from "../shared/utils/poll";

import { SPOTIFY_DEVICE_ICONS, SPOTIFY_DEVICE_PROPERTIES, SPOTIFY_PLAYER_PROPERTIES } from "./spotify_constants";

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_URL = 'https://api.spotify.com';

export default class SpotifyProvider extends Provider<SpotifyService> {
    #config: any
    #token_expiration: number
    #token?: {
        token_type: string
        access_token: string
        expires_in: number
    }

    constructor(id: string, config: any) {
        super(id)
        this.#token_expiration = 0
        this.#config = config

        new Poll(this.#scan.bind(this))
    }

    async #getToken() {
        if (this.#token == null || Date.now() > this.#token_expiration) {
            const req = await fetch(`${SPOTIFY_AUTH_URL}/api/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (Buffer.from(`${this.#config.client_id}:${this.#config.client_secret}`, 'utf-8').toString('base64'))
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.#config.refresh_token,
                    redirect_uri: 'http://localhost'
                })
            })
            this.#token = await req.json()
            this.#token_expiration = Date.now() + (this.#token!.expires_in * 1000) / 2
        }

        return this.#token!
    }

    async #scan() {
        const token = await this.#getToken()
        const options = {
            headers: {
                'Authorization': `${token.token_type} ${token.access_token}`
            }
        }
        return Promise.all([
            fetch(`${SPOTIFY_API_URL}/v1/me/player/devices`, options).then(async (resp: any) => {
                const data = await resp.json()
                const devices = new Set()
                if (data.devices) {
                    for (const d of data.devices) {
                        let device = this.services.get(d.id) as SpotifyDevice | undefined
                        if (!device) {
                            device = new SpotifyDevice(this, d)
                            this.registerService(device)
                            device.registerIdentifier("spotify", d.id)
                        }
                        device.update(d)
                        devices.add(device)
                    }
                }
                this.services.forEach(service => {
                    if (service instanceof SpotifyDevice && !devices.has(service))
                        this.unregisterService(service)
                })
            }),
            fetch(`${SPOTIFY_API_URL}/v1/me/player`, options).then(async (resp: any) => {
                // Playback not available or active
                if (resp.status == 204)
                    return

                const data = await resp.json()
                let player = this.services.get("player") as SpotifyPlayer | undefined
                if (!player) {
                    player = new SpotifyPlayer(this, "player")
                    this.registerService(player)
                    player.registerIdentifier("spotify", "player")
                }
                player.update(data)
            })
        ]).then(_ => {})
    }
}

abstract class SpotifyService extends Service<SpotifyProvider> {}

class SpotifyDevice extends SpotifyService {
    constructor(provider: SpotifyProvider, data: any) {
        super(provider, data.id)
        this.registerProperty("icon", "icon", SPOTIFY_DEVICE_ICONS[data.type])

        for (const [key, property] of Object.entries(SPOTIFY_DEVICE_PROPERTIES))
            this.registerProperty(key, { ...property.definition, ...{
                read_only: !('set' in property)
            }});
    }

    update(data: any) {
        for (const [key, value] of Object.entries(SPOTIFY_DEVICE_PROPERTIES)) {
            const parsed = value.parse(data)
            if (parsed !== undefined)
                this.updateValue(key, parsed)
        }
    }
}

class SpotifyPlayer extends SpotifyService {
    constructor(provider: SpotifyProvider, id: string) {
        super(provider, id)

        this.name = "Spotify"
        this.registerProperty("icon", "icon", "mdi-spotify")

        for (const [key, property] of Object.entries(SPOTIFY_PLAYER_PROPERTIES))
            this.registerProperty(key, { ...property.definition, ...{
                read_only: !('set' in property)
            }});
    }

    update(data: any) {
        for (const [key, value] of Object.entries(SPOTIFY_PLAYER_PROPERTIES)) {
            const parsed = value.parse(data)
            if (parsed !== undefined)
                this.updateValue(key, parsed)
        }
    }
}
