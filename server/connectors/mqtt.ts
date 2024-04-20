import mqtt from 'mqtt'

interface MqttConfig {
    host: string
    topics: string[]
}

export default class Mqtt {
    readonly #config: MqttConfig
    #mqtt?: mqtt.MqttClient
    #listeners: Record<string, (topic: string, message: Buffer) => void> = {}

    constructor(id: string, config: MqttConfig) {
        this.#config = config
        this.#connect()
    }

    #connect() {
        this.#mqtt = mqtt.connect(this.#config.host)
        this.#mqtt.on('connect', () => {
            for (const topic of Object.keys(this.#listeners))
                this.#mqtt!.subscribe(topic)
        })
        this.#mqtt.on('message', (topic, message) => {
            if (topic in this.#listeners)
                this.#listeners[topic](topic, message)

            let parts = topic.split('/')
            for (let i = parts.length - 1; i > 0; i--) {
                let subtopic = parts.slice(0, i).join('/') + '/#'
                if (subtopic in this.#listeners)
                    this.#listeners[subtopic](topic, message)
            }
        })
        this.#mqtt.on('error', (error) => {
            console.error("MQTT error", error)
        })
    }

    on(topic: string, listener: (topic: string, message: Buffer) => void) {
        this.#listeners[topic] = listener
        if (this.#mqtt?.connected)
            this.#mqtt.subscribe(topic)
    }
}
