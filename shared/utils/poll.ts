type PollOptions = {
    interval: number
    maxRetries: number
    retryInterval: number
}

export default class Poll {
    #options: PollOptions
    #fn: () => Promise<void>
    #timeout?: NodeJS.Timeout
    #canceled: boolean
    #retries: number

    constructor(fn: () => Promise<void>, options?: Partial<PollOptions>) {
        this.#fn = fn
        this.#canceled = false
        this.#retries = 0
        this.#options = {...{
            interval: 30 * 1000,
            retryInterval: 5 * 1000,
            maxRetries: 7
        }, ...options}

        this.#run()
    }

    updateOptions(options: Partial<PollOptions>) {
        this.#options = {...this.#options, ...options}
    }

    #run() {
        this.#fn().catch((e) => {
            this.#retries = Math.min(this.#retries + 1, this.#options.maxRetries)
            console.error(e)
        }).then(() => {
            this.#retries = 0
        }).finally(() => {
            if (!this.#canceled) {
                let interval = this.#retries > 0 ? 2 ** this.#retries * this.#options.retryInterval : this.#options.interval
                this.#timeout = setTimeout(this.#run.bind(this), interval)
            }
        })
    }

    cancel() {
        if (this.#timeout)
            clearTimeout(this.#timeout)
    }
}
