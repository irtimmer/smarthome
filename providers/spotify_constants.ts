import { Property } from "../shared/definitions"

interface SpotifyServiceProperty {
    parse: (data: any) => any
    definition: Omit<Property, 'read_only'>
}

export const SPOTIFY_PLAYER_PROPERTIES: Record<string, SpotifyServiceProperty> = {
    is_playing: {
        parse: (data: any) => data.is_playing,
        definition: {
            '@type': 'playing',
            type: 'boolean',
            label: 'Playing'
        }
    },
    shuffle_state: {
        parse: (data: any) => data.shuffle_state,
        definition: {
            '@type': 'shuffle',
            type: 'boolean',
            label: 'Shuffle'
        }
    },
    repeat_state: {
        parse: (data: any) => data.repeat_state,
        definition: {
            type: 'string',
            label: 'Repeat',
        }
    },
    progress_ms: {
        parse: (data: any) => data.progress_ms,
        definition: {
            '@type': 'progress',
            type: 'number',
            label: 'Progress',
        }
    },
    image: {
        parse: (data: any) => data.item?.album?.images[0]?.url,
        definition: {
            '@type': 'image',
            type: 'string',
            label: 'Image',
        }
    },
    album: {
        parse: (data: any) => data.item?.album?.name,
        definition: {
            '@type': 'album',
            type: 'string',
            label: 'Album',
        }
    },
    item: {
        parse: (data: any) => data.item?.name,
        definition: {
            '@type': 'item',
            type: 'string',
            label: 'Item',
        }
    },
    artists: {
        parse: (data: any) => data.item?.artists?.map((x: any) => x.name).join(', '),
        definition: {
            '@type': 'artists',
            type: 'string',
            label: 'Artists',
        }
    }
}

export const SPOTIFY_DEVICE_PROPERTIES: Record<string, SpotifyServiceProperty> = {
    volume_percent: {
        parse: (data: any) => data.volume_percent,
        definition: {
            type: 'number',
            label: 'Volume'
        }
    },
    type: {
        parse: (data: any) => data.type,
        definition: {
            type: 'string',
            label: 'Type'
        }
    },
    name: {
        parse: (data: any) => data.name,
        definition: {
            '@type': 'name',
            type: 'string',
            label: 'Type',
            group: "internal"
        }
    }
}
