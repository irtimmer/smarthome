import fs from "fs"
import tls from "tls"

import protobufjs from "protobufjs"

import Provider from "../shared/provider"
import Service from "../shared/service"
import Poll from "../shared/utils/poll"

import { ANDROIDTV_PROPERTIES } from "./androidtv_constants"

interface AndroidTVConfig {
    key: string
    cert: string
    host: string
}

export default class AndroidTVProvider extends Provider<AndroidTVService> {
    #config: AndroidTVConfig
    #remoteProto: protobufjs.Root

    constructor(id: string, config: AndroidTVConfig) {
        super(id)
        this.#config = config
        this.#remoteProto = protobufjs.loadSync('providers/androidtv/remote.proto');

        const service = new AndroidTVService(this)
        this.registerService(service)
        new Poll(() => new Promise((resolve, reject) => this.connect(service, resolve, reject)))
    }

    connect(service: AndroidTVService, resolve: () => void, reject: (reason: any) => void) {
        const RemoteMessage = this.#remoteProto.lookupType("remote.RemoteMessage");
        let connected = false
        const client = tls.connect({
            host: this.#config.host,
            port: 6466,
            key: fs.readFileSync(this.#config.key).toString(),
            cert: fs.readFileSync(this.#config.cert).toString(),
            rejectUnauthorized: false,
        });

        client.setTimeout(10000)

        let chunks: Uint8Array[] = []
        client.on("data", (chunk: Uint8Array) => {
            chunks.push(chunk)

            const buffer = Buffer.concat(chunks)
            if(buffer.length > 0 && buffer.readInt8(0) === buffer.length - 1) {
                const message: any = RemoteMessage.decodeDelimited(buffer)

                if(message.remoteConfigure) {
                    client.write(RemoteMessage.encodeDelimited(RemoteMessage.create({
                        remoteConfigure:{
                            code1: 622,
                            deviceInfo: {
                                model: "Smarthome",
                                vendor: "Smarthome",
                                unknown1: 1,
                                unknown2: "1",
                                packageName: "androidtv-remote",
                                appVersion: "1.0.0",
                            }
                        }
                    })).finish())

                    connected = true
                } else if(message.remoteSetActive)
                    client.write(RemoteMessage.encodeDelimited(RemoteMessage.create({
                        remoteSetActive:{
                            active: 622
                        }
                    })).finish())
                else if(message.remotePingRequest)
                    client.write(RemoteMessage.encodeDelimited(RemoteMessage.create({
                        remotePingResponse:{
                            val1: message.remotePingRequest.val1
                        }
                    })).finish())

                service.update(message)

                chunks = []
            }
        })

        client.on("error", e => !connected ? reject(e) : null)
        client.on("close", _ => connected ? resolve() : null)
    }
}

class AndroidTVService extends Service<AndroidTVProvider> {
    constructor(provider: AndroidTVProvider) {
        super(provider, "androidtv")
        this.registerIdentifier("provider", provider.id)
        this.registerType("television")

        for (const [_msg, properties] of Object.entries(ANDROIDTV_PROPERTIES))
            for (const [key, property] of Object.entries(properties))
                this.registerProperty(key, {...property.definition, ...{
                    read_only: true
                }})
    }

    update(message: any) {
        for (const [msgKey, properties] of Object.entries(ANDROIDTV_PROPERTIES)) {
            if (message[msgKey]) {
                for (const [key, property] of Object.entries(properties))
                    this.updateValue(key, property.parse(message[msgKey]))
            }
        }
    }
}
