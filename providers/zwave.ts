import { Driver, ZWaveNode, ZWaveNodeValueAddedArgs, ZWaveNodeValueUpdatedArgs, TranslatedValueID, ValueID, ValueMetadataNumeric, NodeStatus, ZWaveController } from "zwave-js";

import { Property } from "../shared/definitions";
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
        const nodeKey = node.id.toString()
        let nodeService = this.services.get(nodeKey) as ZWaveDeviceService | undefined
        if (!nodeService) {
            nodeService = new ZWaveDeviceService(this, nodeKey, node, "Device")
            nodeService.setNodeStatus(node.status)
            this.registerService(nodeService)
        }

        node.on("value added", this.#addOrUpdateValue.bind(this))
        node.on("value updated", this.#addOrUpdateValue.bind(this))
        node.on("alive", () => nodeService!.setNodeStatus(NodeStatus.Alive))
        node.on("dead", () => nodeService!.setNodeStatus(NodeStatus.Dead))
        node.on("sleep", () => nodeService!.setNodeStatus(NodeStatus.Asleep))
        node.on("wake up", () => nodeService!.setNodeStatus(NodeStatus.Awake))

        node.getDefinedValueIDs().forEach((args) => this.#addOrUpdateValue(node, args))
    }

    #addOrUpdateValue(node: ZWaveNode, args: TranslatedValueID | ZWaveNodeValueUpdatedArgs | ZWaveNodeValueAddedArgs) {
        const serviceKey = ZWaveCommandClassService.serviceId(node, args)
        let service = this.services.get(serviceKey) as ZWaveCommandClassService | undefined
        if (!service) {
            service = new ZWaveCommandClassService(this, node, args.endpoint, args.commandClass, args.commandClassName)
            this.registerService(service)
            service.registerIdentifier("zwave", node.id.toString())
        }

        service.addOrUpdateValue(args)
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
        this.registerProperty("status", {
            type: "string",
            label: "Status",
            read_only: true
        })
        this.registerProperty("alive", {
            "@type": "connected",
            type: "boolean",
            label: "Alive",
            read_only: true,
            group: "internal"
        })
        this.updateValue("name", node.name ?? `${node.deviceConfig?.manufacturer} ${node.deviceConfig?.label}`)

        this.registerAction("refreshInfo", {
            label: 'Refresh Info'
        })
        this.registerAction("refreshValues", {
            label: 'Refresh Values'
        })
    }

    setNodeStatus(status: NodeStatus) {
        this.updateValue("status", status)
        this.updateValue("alive", ![NodeStatus.Dead, NodeStatus.Unknown].includes(status))
    }

    triggerAction(key: string, props: any): Promise<void> {
        switch (key) {
            case 'refreshInfo':
                return this.node.refreshInfo()
            case 'refreshValues':
                return this.node.refreshValues()
            default:
                return super.triggerAction(key, props);
        }
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
    readonly #endpoint?: number
    readonly #commandClass: number

    constructor(provider: ZWaveProvider, node: ZWaveNode, endpoint: number | undefined, commandClass: number, name: string) {
        super(provider, ZWaveCommandClassService.serviceId(node, {
            endpoint,
            commandClass
        }), node, name)
        this.#endpoint = endpoint
        this.#commandClass = commandClass
    }

    addOrUpdateValue(args: TranslatedValueID | ZWaveNodeValueUpdatedArgs | ZWaveNodeValueAddedArgs) {
        let propertyKey = [args.property.toString(), args.propertyKey].filter(x => x).join('/')

        if (!this.properties.has(propertyKey)) {
            const metadata = this.node.getValueMetadata(args)
            let options: Property = {
                type: metadata.type,
                label: metadata.label ?? args.propertyName ?? args.property.toString(),
                read_only: !metadata.writeable
            }

            if (metadata.type == "number") {
                const numericMeta = metadata as ValueMetadataNumeric
                options = {...options, ...{
                    min: numericMeta.min,
                    max: numericMeta.max,
                    unit: numericMeta.unit
                }}
            }

            if (metadata.type == "boolean" && !metadata.readable)
                this.registerAction(propertyKey, options)
            else {
                this.registerProperty(propertyKey, options)
                this.updateValue(propertyKey, this.node.getValue(args))
            }
        } else if ('newValue' in args)
            this.updateValue(propertyKey, args.newValue)
    }

    setValue(key: string, value: any): Promise<void> {
        let [property, propertyKey]: (string | number)[] = key.split('/')
        if (/^\d+$/.test(property))
            property = parseInt(property)

        if (/^\d+$/.test(propertyKey))
            propertyKey = parseInt(propertyKey)

        return this.node.setValue({
            endpoint: this.#endpoint,
            commandClass: this.#commandClass,
            property,
            propertyKey
        }, value).then(success => {
            return success ? Promise.resolve() : Promise.reject()
        })
    }

    triggerAction(key: string, _props: any): Promise<void> {
        return this.setValue(key, true)
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
