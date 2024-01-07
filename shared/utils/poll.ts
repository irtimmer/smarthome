type RetryOptions = {
    interval: number
    maxRetries: number
    retryInterval: number
}

export class Retry {
    #options: RetryOptions
    #timeout?: NodeJS.Timeout
    #canceled: boolean
    #retries: number
    fn: () => Promise<void>

    constructor(fn: () => Promise<void>, options?: Partial<RetryOptions>) {
        this.fn = fn
        this.#canceled = false
        this.#retries = 0
        this.#options = {...{
            interval: 30 * 1000,
            retryInterval: 5 * 1000,
            maxRetries: 7
        }, ...options}

        this.run()
    }

    succeeded() {
        this.#retries = 0
    }

    run() {
        this.#retries = Math.min(this.#retries + 1, this.#options.maxRetries)
        this.fn().catch(e => {
            this.retry(e)
        })
    }

    retry(e?: any) {
        console.error(`Attempt ${this.#retries} of ${this.#options.maxRetries}`, e)
        this.schedule()
    }

    schedule() {
        if (this.#canceled)
            return

        let interval = this.#retries > 0 ? 2 ** this.#retries * this.#options.retryInterval : this.#options.interval
        this.#timeout = setTimeout(this.run.bind(this), interval)
    }

    cancel() {
        if (this.#timeout)
            clearTimeout(this.#timeout)

        this.#canceled = true
    }
}

export default class Poll extends Retry {
    run() {
        this.fn().catch(e => this.retry(e))
        .then(() => {
            this.succeeded()
            this.schedule.bind(this)
        })
    }
}
