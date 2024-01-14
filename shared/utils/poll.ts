type RetryOptions = {
    interval: number
    maxRetries: number
    retryInterval: number
}

export class Retry {
    #timeout?: NodeJS.Timeout
    #canceled: boolean
    readonly options: RetryOptions
    attempt: number
    fn: () => Promise<void>

    constructor(fn: () => Promise<void>, options?: Partial<RetryOptions>) {
        this.#canceled = false
        this.fn = fn
        this.attempt = 0
        this.options = {...{
            interval: 0,
            retryInterval: 5 * 1000,
            maxRetries: 7
        }, ...options}

        this.run()
    }

    succeeded() {
        this.attempt = 0
    }

    run() {
        this.attempt += 1
        this.fn().catch(e => {
            this.retry(e)
        })
    }

    retry(e?: any) {
        const wait = (2 ** Math.min(this.attempt, this.options.maxRetries) * this.options.retryInterval) / 1000
        console.error(`Attempt ${this.attempt} failed, retry in ${wait}s`, e?.message ?? e)
        this.schedule()
    }

    schedule() {
        if (this.#canceled)
            return

        let interval = this.attempt > 0 ? 2 ** Math.min(this.attempt, this.options.maxRetries) * this.options.retryInterval : this.options.interval
        this.#timeout = setTimeout(this.run.bind(this), interval)
    }

    cancel() {
        if (this.#timeout)
            clearTimeout(this.#timeout)

        this.#canceled = true
    }
}

export default class Poll extends Retry {
    constructor(fn: () => Promise<void>, options?: Partial<RetryOptions>) {
        super(fn, {...{
            interval: 30 * 1000
        }, ...options})
    }

    run() {
        this.fn().then(() => {
            this.succeeded()
            this.schedule()
        }).catch(e => {
            this.attempt += 1
            this.retry(e)
        })
    }
}
