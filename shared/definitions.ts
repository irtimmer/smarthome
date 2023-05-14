export type PropertyGroup = 'internal' | 'config' | "meta"

export interface Property {
    '@type'?: string
    type: string
    label: string
    read_only: boolean
    group?: PropertyGroup
    min?: number
    max?: number
    unit?: string
    options?: { [key: string]: string | number }
}

export interface Action {
    label: string
    group?: PropertyGroup
}
