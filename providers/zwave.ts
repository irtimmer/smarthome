import { Driver, ZWaveNode, ZWaveNodeValueAddedArgs, ZWaveNodeValueUpdatedArgs, TranslatedValueID, ValueID, ZWaveController } from "zwave-js";

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
            const service = new ZWaveControllerService(this, "controller", this.#driver.controller, "Controller")
            this.registerService(service)

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
            service = new ZWaveDeviceService(this, nodeKey, node, "Device")
            this.registerService(service)
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

class ZWaveDeviceService extends ZWaveService {
    constructor(provider: ZWaveProvider, id: string, node: ZWaveNode, name: string) {
        super(provider, id, node, name)

        this.registerIdentifier("zwave", node.id.toString())
        this.registerProperty("name", {
            "@type": "name",
            type: "string",
            label: "Name",
            read_only: false,
            group: "config"
        })
        this.updateValue("name", node.name ?? `${node.deviceConfig?.manufacturer} ${node.deviceConfig?.label}`)
    }

    setValue(key: string, value: any): Promise<void> {
        switch (key) {
            case 'name':
                this.node.name = value
                this.updateValue('name', value)
                return Promise.resolve()
        }
        return Promise.reject()
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

class ZWaveControllerService extends ZWaveService {
    #controller: ZWaveController

    constructor(provider: ZWaveProvider, id: string, controller: ZWaveController, name: string) {
        super(provider, id, controller.nodes.get(controller.ownNodeId!)!, name)
        this.#controller = controller

        this.registerIdentifier("zwave", "controller")

        this.registerProperty("rfRegion", {
            type: 'string',
            label: 'RF Region',
            read_only: true
        })
        controller.getRFRegion().then(region => this.updateValue("rfRegion", region)).catch(_ => {})

        this.registerProperty("homeId", {
            type: 'string',
            label: 'Home Id',
            read_only: true
        }, controller.homeId)

        this.registerProperty("inclusionState", {
            type: 'string',
            label: 'Inclusion State',
            read_only: true
        })

        const updateInclusion = () => this.updateValue("inclusionState", controller.inclusionState)
        controller.on("inclusion started", updateInclusion)
        controller.on("inclusion stopped", updateInclusion)
        controller.on("inclusion failed", updateInclusion)
        controller.on("exclusion started", updateInclusion)
        controller.on("inclusion stopped", updateInclusion)
        controller.on("inclusion failed", updateInclusion)
        updateInclusion()

        this.registerAction("beginInclusion", {
            label: "Begin Inclusion"
        })
        this.registerAction("stopInclusion", {
            label: "Stop Inclusion"
        })

        this.registerAction("beginExclusion", {
            label: "Begin Exclusion"
        })
        this.registerAction("stopExclusion", {
            label: "Stop Exclusion"
        })
    }

    triggerAction(key: string, _props: any): Promise<void> {
        switch (key) {
            case "beginInclusion":
                return this.#controller.beginInclusion().then((_) => {})
            case "stopInclusion":
                return this.#controller.stopInclusion().then((_) => {})
            case "beginExclusion":
                return this.#controller.beginExclusion().then((_) => {})
            case "stopExclusion":
                return this.#controller.stopExclusion().then((_) => {})
            default:
                return Promise.reject()
        }
    }
}
