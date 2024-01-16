export interface Logger {
    write(service: string, type: string, key: string, value: any): void
}
