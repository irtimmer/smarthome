import ws, { WebSocket } from "ws"

import logging from "../logging";

interface PendingCall {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
}

export default class Rpc {
    #socket: WebSocket
    #onCall: (method: string, params: any) => Promise<any>
    #logger: ReturnType<typeof logging>
    #callIdCounter: number = 0
    #outstandingCalls: Map<number, PendingCall> = new Map()

    constructor(socket: WebSocket, onCall: (method: string, params: any) => Promise<any>) {
        this.#socket = socket
        this.#onCall = onCall
        this.#logger = logging().child({ module: "rpc" })

        this.#socket.on("message", this.#onMessage.bind(this))
    }

    #onMessage(msg: ws.RawData) {
        let data: any = null
        try {
            data = JSON.parse(msg.toString())
            if (data.id && (data.result || data.error)) {
                const call = this.#outstandingCalls.get(data.id)
                if (!call) {
                    this.#logger.error(`No pending call for id ${data.id}`)
                    return
                }

                this.#outstandingCalls.delete(data.id)
                return data.error
                    ? call.reject(new Error(data.error.message))
                    : call.resolve(data.result);
            } else if (data.method && data.params)
                this.#handleCall(data)
            else
                throw new Error("Invalid message format")
        } catch (e: any) {
            this.#logger.error(e?.message ?? e)
            this.#socket.close()
            return
        }
    }

    async #handleCall(data: any) {
        try {
            const result = await this.#onCall(data.method!, data.params!)
            
            if (data.id)
                this.#socket.send(JSON.stringify({
                    id: data.id,
                    result
                }))
        } catch (e: any) {
            this.#logger.error(e?.message ?? e)
            
            if (data.id)
                this.#socket.send(JSON.stringify({
                    id: data.id,
                    error: {
                        code: -32000,
                        message: e.toString()
                    }
                }))
        }
    }

    async call(method: string, params: any, ret: boolean = false) {
        const message = {
            id: ret ? this.#callIdCounter++ : undefined,
            method,
            params
        }

        if (!ret) {
            this.#socket.send(JSON.stringify(message))
            return Promise.resolve()
        }

        return new Promise((resolve, reject) => {
            this.#outstandingCalls.set(message.id!, { resolve, reject })
            this.#socket.send(JSON.stringify(message))
        })
    }
}
