import { Logger } from "pino";

export default abstract class Task {
    abstract set logger(logger: Logger | undefined)
    abstract get status(): string
}
