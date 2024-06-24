import * as fs from 'fs';

import logging from "./logging";

import Store from '../shared/store';

export default class Storage implements Store {
    #id: string
    #storage: Record<string, any>
    #logger: ReturnType<typeof logging>

    constructor(id: string) {
        this.#logger = logging().child({ module: 'storage' })
        this.#id = id
        this.#storage = {}
        this.#load()
    }

    #load() {
        try {
            const data = fs.readFileSync(`data/${this.#id}.json`)
            this.#storage = JSON.parse(data.toString())
        } catch (e) {
            this.#logger.warn({ id: this.#id }, "Can't load")
        }
    }

    #save() {
        try {
            fs.writeFileSync(`data/${this.#id}.json`, JSON.stringify(this.#storage))
        } catch (e) {
            this.#logger.error({ id: this.#id }, "Can't save")
        }
    }

    get(key: string): any {
        return this.#storage[key]
    }

    set(key: string, value: any): void {
        if (this.#storage[key] == value)
            return

        this.#storage[key] = value
        this.#save()
    }

    has(key: string): boolean {
        return key in this.#storage
    }

    delete(key: string): void {
        delete this.#storage[key]
        this.#save()
    }

    clear(): void {
        this.#storage = {}
        this.#save()
    }
}
