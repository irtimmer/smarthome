import { Service } from "../shared/service"

export type ServiceFilter = {
    type: string
}

export function matchServiceFilter(filter: ServiceFilter, service: Service) {
    for (const type of service.types.values())
        if (filter.type == type)
            return true

    return false
}
