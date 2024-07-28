export type PropertyGroup = 'internal' | 'control' | 'config' | "meta"

export interface Property {
    '@type'?: string
    type: string
    logical_type?: string
    label: string
    read_only: boolean
    hide_null?: boolean
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

export interface ServiceEvent {
    label: string
    properties: Record<string, Omit<Property, "read_only">>
}
