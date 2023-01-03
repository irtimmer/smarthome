export interface Property {
    '@type'?: string
    type: string
    label: string
    read_only: boolean
    min?: number
    max?: number
    unit?: string
}

export interface Action {
    label: string
}
