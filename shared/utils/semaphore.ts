export class Semaphore {
    max: number
    #active: number
    #fns: ((done: () => void) => void)[]

    constructor(max = 1) {
        this.max = max;
        this.#fns = [];
        this.#active = 0;
    }

    get remaining() {
        return this.#fns.length;
    }

    get active() {
        return this.#active;
    }

    take(fn: (done: () => void) => void) {
        this.#fns.push(fn);
        this.#try();
    }

    #done() {
        this.#active -= 1;
        this.#try();
    }

    #try() {
        if (this.#active === this.max || this.#fns.length === 0)
            return;

        let fn = this.#fns.shift();
        this.#active += 1;
        if (fn)
            fn(this.#done.bind(this));
    }
  }