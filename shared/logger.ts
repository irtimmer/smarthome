export interface Logger {
    write(service: string, key: string, value: any): void
}
