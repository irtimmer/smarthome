export const filterDevices = (devices: Ref<Map<string, Device>>, filter: any) =>{
    let entries = Iterator.from(devices.value.entries())
    return Array.from(entries.filter(([_, device]) => {
        let store = useStore()
        let match = true
    
        let services = device.services.map((id): Service => store.services.get(id)!).filter((s) => s !== undefined)
        let types = new Set(services.values().map((service) => service.types).toArray().flat())
        if (!(filter.type || []).some((type: string) => types.has(type)))
            match = false

        return match
    }).map(([id, _]) => id))
}
