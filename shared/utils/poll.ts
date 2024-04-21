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
            retryInterval: 5,
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
        let wait = this.attempt > 0 ? 2 ** Math.min(this.attempt, this.options.maxRetries) * this.options.retryInterval : this.options.interval
        if (e instanceof RetryAfterError && e.retryAfter > wait)
            wait = e.retryAfter

        console.error(`Attempt ${this.attempt} failed, retry in ${wait}s`, e?.message ?? e)
        this.schedule(wait)
    }

    schedule(interval?: number) {
        if (this.#canceled)
            return

        if (!interval)
            interval = this.attempt > 0 ? 2 ** Math.min(this.attempt, this.options.maxRetries) * this.options.retryInterval : this.options.interval

        this.#timeout = setTimeout(this.run.bind(this), interval * 1000)
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
            interval: 30
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

export class RetryAfterError extends Error {
    retryAfter: number

    constructor(message: string, retryAfter: number) {
      super(message)
      this.retryAfter = retryAfter
      this.name = "RetryAfterError"
    }
}
