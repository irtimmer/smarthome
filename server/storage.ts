import * as fs from 'fs';

import Store from '../shared/store';

export default class Storage implements Store {
    #id: string
    #storage: Record<string, any>

    constructor(id: string) {
        this.#id = id
        this.#storage = {}
        this.#load()
    }

    #load() {
        try {
            const data = fs.readFileSync(`data/${this.#id}.json`)
            this.#storage = JSON.parse(data.toString())
        } catch (e) {
            console.error(`Can't load storage ${this.#id}`)
        }
    }

    #save() {
        try {
            fs.writeFileSync(`data/${this.#id}.json`, JSON.stringify(this.#storage))
        } catch (e) {
            console.error(`Can't save storage ${this.#id}`, e)
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
