import {InfluxDB, WriteApi, Point} from '@influxdata/influxdb-client'

import { Logger } from '../shared/logger'

type Config = {
    url: string
    token: string
    organisation: string
    bucket: string
}

export default class InfluxDBLogger implements Logger {
    #writeApi: WriteApi

    constructor(config: Config) {
        const influxDB = new InfluxDB({
            url: config.url,
            token: config.token
        })
        this.#writeApi = influxDB.getWriteApi(config.organisation, config.bucket)
    }

    write(service: string, type: string, key: string, value: any): void {
        const point = new Point(type)
            .tag('service_id', service)
            .tag('property', key)
            .floatField('value', value)

        this.#writeApi.writePoint(point)
    }
}
