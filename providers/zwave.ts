import { Driver, ZWaveNode, ZWaveNodeValueAddedArgs, ZWaveNodeValueUpdatedArgs, TranslatedValueID, ValueID } from "zwave-js";

import Provider from "../shared/provider";
import Service from "../shared/service";

interface ZWaveConfig {
    port: string,
    keys: {
        s0: string
        s2_unauthenticated: string
        s2_authenticated: string
        s2_access_control: string
    }
}

export default class ZWaveProvider extends Provider<ZWaveService> {
    #driver: Driver

    constructor(id: string, config: ZWaveConfig) {
        super(id)
        this.#driver = new Driver(config.port, {
            logConfig: {
                enabled: false
            },
            securityKeys: {
                S2_Unauthenticated: Buffer.from(config.keys.s2_unauthenticated, 'hex'),
                S2_Authenticated: Buffer.from(config.keys.s2_authenticated, 'hex'),
                S2_AccessControl: Buffer.from(config.keys.s2_access_control, 'hex'),
                S0_Legacy: Buffer.from(config.keys.s0, 'hex')
            }
        })
        this.#driver.once("driver ready", () => {
            this.#driver.controller.nodes.forEach(this.#addNode.bind(this))
            this.#driver.controller.on("node added", this.#addNode.bind(this))
        })

        this.#driver.on("error", e => console.error(e))
        this.#driver.start().catch(e => console.error(e))
    }

    #addNode(node: ZWaveNode) {
        node.on("value added", this.#addValue.bind(this))
        node.on("value updated", this.#addValue.bind(this))

        node.getDefinedValueIDs().forEach((args) => this.#addValue(node, args))
    }

    #addValue(node: ZWaveNode, args: TranslatedValueID | ZWaveNodeValueUpdatedArgs | ZWaveNodeValueAddedArgs) {
        const nodeKey = node.id.toString()
        let service = this.services.get(nodeKey)
        if (!service) {
            service = new ZWaveService(this, nodeKey, node, "Device")
            this.registerService(service)
            service.registerIdentifier("zwave", node.id.toString())

            service.registerProperty("name", {
                "@type": "name",
                type: "string",
                label: "Name",
                read_only: true
            })
            service.updateValue("name", node.name ?? `${node.deviceConfig?.manufacturer} ${node.deviceConfig?.label}`)
        }

        const serviceKey = ZWaveCommandClassService.serviceId(node, args)
        service = this.services.get(serviceKey)
        if (!service) {
            service = new ZWaveCommandClassService(this, node, args.endpoint, args.commandClass, args.commandClassName)
            this.registerService(service)
            service.registerIdentifier("zwave", node.id.toString())
        }

        let propertyKey = args.property.toString()
        if (args.propertyKey)
            propertyKey += `/${args.propertyKey}`

        if (!service.properties.has(propertyKey)) {
            const metadata = node.getValueMetadata(args)
            service.registerProperty(propertyKey, {
                type: metadata.type,
                label: metadata.label ?? args.propertyName ?? args.property.toString(),
                read_only: !metadata.writeable
            })
            service.updateValue(propertyKey, node.getValue(args))
        } else if ('newValue' in args)
            service.updateValue(propertyKey, args.newValue)
    }
}

class ZWaveService extends Service<ZWaveProvider> {
    readonly node: ZWaveNode

    constructor(provider: ZWaveProvider, id: string, node: ZWaveNode, name: string) {
        super(provider, id)
        this.node = node
        this.name = name
    }
}

class ZWaveCommandClassService extends ZWaveService {
    constructor(provider: ZWaveProvider, node: ZWaveNode, endpoint: number | undefined, commandClass: number, name: string) {
        super(provider, ZWaveCommandClassService.serviceId(node, {
            endpoint,
            commandClass
        }), node, name)
    }

    static serviceId(node: ZWaveNode, args: Omit<ValueID, 'property'>) {
        return `${node.id}-${args.endpoint}-${args.commandClass}`
    }
}
