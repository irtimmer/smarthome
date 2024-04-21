import pino, { LoggerOptions } from "pino";

let instance: pino.Logger;

export default function logger(options: LoggerOptions<never> | undefined = undefined) {
    if (!instance)
        instance = pino(options);
    
    return instance;
}