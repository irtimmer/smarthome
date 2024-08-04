import { Driver, ZWaveNode, ZWaveNodeValueAddedArgs, ZWaveNodeValueUpdatedArgs, TranslatedValueID, ValueID, ValueMetadataNumeric, NodeStatus, ZWaveController } from "zwave-js";

import { Property } from "../shared/definitions";
import Provider, { ProviderManager } from "../shared/provider";
import Service from "../shared/service";

import { ZWAVE_COMMAND_CLASS_PROPERTIES, ZWAVE_COMMAND_CLASS_PROPERTY_TYPE_CLASS, ZWAVE_DEVICE_CLASS_TYPES, ZWAVE_SERVICE_GROUP, ZWAVE_SERVICE_PRIORITIES } from "./zwave_constants";

interface ZWaveConfig {
    port: string,
    keys: {
        s0: string
        s2_unauthenticated: string
        s2_authenticated: string
        s2_access_control: string
    }
}

const convertValue = (type: string, value: any) => type == 'enum' ? String(value) : value

export default class ZWaveProvider extends Provider<ZWaveService> {
    readonly driver: Driver

    constructor(manager: ProviderManager, config: ZWaveConfig) {
        super(manager)
        this.driver = new Driver(config.port, {
            logConfig: {
                enabled: false
            },
            storage: {
                "cacheDir": `./cache/${this.id}`
            },
            securityKeys: {
                S2_Unauthenticated: Buffer.from(config.keys.s2_unauthenticated, 'hex'),
                S2_Authenticated: Buffer.from(config.keys.s2_authenticated, 'hex'),
                S2_AccessControl: Buffer.from(config.keys.s2_access_control, 'hex'),
                S0_Legacy: Buffer.from(config.keys.s0, 'hex')
            }
        })
        this.driver.once("driver ready", () => {
            const service = new ZWaveControllerService(this, "controller", this.driver.controller, "Controller")
            this.registerService(service)

            this.driver.controller.nodes.forEach(this.#addNode.bind(this))
            this.driver.controller.on("node added", this.#addNode.bind(this))
        })

        this.driver.on("error", e => console.error(e))
        this.driver.start().catch(e => console.error(e))
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
            group: "meta"
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

        this.registerProperty("product", {
            type: "string",
            label: "Product",
            read_only: true,
            group: "meta"
        }, node.deviceConfig?.label)
        this.registerProperty("manufacturer", {
            type: "string",
            label: "Manufacturer",
            read_only: true,
            group: "meta"
        }, node.deviceConfig?.manufacturer)

        this.registerAction("refreshInfo", {
            label: 'Refresh Info',
            group: "control"
        })
        this.registerAction("refreshValues", {
            label: 'Refresh Values',
            group: "control"
        })

        if (node.deviceClass) {
            const baseClass = ZWAVE_DEVICE_CLASS_TYPES[node.deviceClass.generic.key]
            if (baseClass) {
                if (node.deviceClass.specific.key in baseClass)
                    this.registerType(baseClass[node.deviceClass.specific.key])

                this.registerType(baseClass._)
            }
        }
    }

    setNodeStatus(status: NodeStatus) {
        this.updateValue("status", status)
        this.updateValue("alive", ![NodeStatus.Dead, NodeStatus.Unknown].includes(status))
    }

    async triggerAction(key: string, props: any) {
        switch (key) {
            case 'refreshInfo':
                await this.node.refreshInfo()
                break
            case 'refreshValues':
                await this.node.refreshValues()
                break
            default:
                throw Error("Invalid action")
        }
    }

    async setValue(key: string, value: any) {
        switch (key) {
            case 'name':
                this.node.name = value
                this.updateValue('name', value)
                break
            default:
                throw Error("Invalid property")
        }
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

        if (commandClass in ZWAVE_SERVICE_PRIORITIES)
            this.priority = ZWAVE_SERVICE_PRIORITIES[commandClass]
        else {
            let supportedCC = node.deviceClass?.specific.supportedCCs.indexOf(commandClass) ?? -1;
            this.priority = supportedCC >= 0 ? 60 - supportedCC : (commandClass < 64 ? 30 : 10)
        }
    }

    addOrUpdateValue(args: TranslatedValueID | ZWaveNodeValueUpdatedArgs | ZWaveNodeValueAddedArgs) {
        let propertyKey = [args.property.toString(), args.propertyKey].filter(x => x).join('/')

        let propertySettings = undefined
        if (args.commandClass in ZWAVE_COMMAND_CLASS_PROPERTIES && propertyKey in ZWAVE_COMMAND_CLASS_PROPERTIES[args.commandClass]) {
            propertySettings = ZWAVE_COMMAND_CLASS_PROPERTIES[args.commandClass][propertyKey]

            // Ignore properties set to null
            if (propertySettings == null)
                return

            // Change to alias value
            if (propertySettings.alias)
                propertyKey = propertySettings.alias
        }

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
                if (numericMeta.states) {
                    options = {...options, ...{
                        type: 'enum',
                        options: numericMeta.states
                    }}
                }
            }

            if (args.commandClass in ZWAVE_SERVICE_GROUP)
                options.group = ZWAVE_SERVICE_GROUP[args.commandClass]

            if (propertySettings?.definition)
                options = {...options, ...propertySettings.definition}

            if (options.hide_null === undefined && options.read_only)
                options.hide_null = true

            if (metadata.type == "boolean" && !metadata.readable)
                this.registerAction(propertyKey, options)
            else {
                this.registerProperty(propertyKey, options)
                this.updateValue(propertyKey, convertValue(options.type, this.node.getValue(args)))
            }

            if (args.commandClass in ZWAVE_COMMAND_CLASS_PROPERTY_TYPE_CLASS && propertyKey in ZWAVE_COMMAND_CLASS_PROPERTY_TYPE_CLASS[args.commandClass])
                this.registerType(ZWAVE_COMMAND_CLASS_PROPERTY_TYPE_CLASS[args.commandClass][propertyKey])

        } else if ('newValue' in args)
            this.updateValue(propertyKey, convertValue(this.properties.get(propertyKey)!.type, args.newValue))
    }

    async setValue(key: string, value: any) {
        if (this.#commandClass in ZWAVE_COMMAND_CLASS_PROPERTIES && key in ZWAVE_COMMAND_CLASS_PROPERTIES[this.#commandClass]) {
            const propertySettings = ZWAVE_COMMAND_CLASS_PROPERTIES[this.#commandClass][key]!

            // Change to alias value
            if (propertySettings.set)
                key = propertySettings.set
        }

        let [property, propertyKey]: (string | number)[] = key.split('/')
        if (/^\d+$/.test(property))
            property = parseInt(property)

        if (/^\d+$/.test(propertyKey))
            propertyKey = parseInt(propertyKey)

        if (this.properties.get(key)?.type == 'enum')
            value = parseInt(value)

        return await this.node.setValue({
            endpoint: this.#endpoint,
            commandClass: this.#commandClass,
            property,
            propertyKey
        }, value).then(success => {
            return success ? Promise.resolve() : Promise.reject()
        })
    }

    async triggerAction(key: string, _props: any) {
        return await this.setValue(key, true)
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
            read_only: true,
            group: "meta"
        })
        controller.getRFRegion().then(region => this.updateValue("rfRegion", region)).catch(_ => {})

        this.registerProperty("homeId", {
            type: 'string',
            label: 'Home Id',
            read_only: true,
            group: "meta"
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
            label: "Begin Inclusion",
            group: "control"
        })
        this.registerAction("stopInclusion", {
            label: "Stop Inclusion",
            group: "control"
        })

        this.registerAction("beginExclusion", {
            label: "Begin Exclusion",
            group: "control"
        })
        this.registerAction("stopExclusion", {
            label: "Stop Exclusion",
            group: "control"
        })

        this.registerAction("rebuildRoutes", {
            label: "Rebuild Routes",
            group: "control"
        })
        this.registerAction("softReset", {
            label: "Soft Reset",
            group: "control"
        })
    }

    async triggerAction(key: string, _props: any) {
        switch (key) {
            case "beginInclusion":
                await this.#controller.beginInclusion()
                break
            case "stopInclusion":
                await this.#controller.stopInclusion()
                break
            case "beginExclusion":
                await this.#controller.beginExclusion()
                break
            case "stopExclusion":
                await this.#controller.stopExclusion()
                break
            case "rebuildRoutes":
                return this.#controller.beginRebuildingRoutes() ? Promise.resolve() : Promise.reject()
            case "softReset":
                await this.provider.driver.softReset()
                break
            default:
                throw Error("Invalid action")
        }
    }
}
