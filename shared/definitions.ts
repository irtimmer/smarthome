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
}

export interface Action {
    label: string
    group?: PropertyGroup
}
