import {InfluxDB, WriteApi, Point, QueryApi} from '@influxdata/influxdb-client'

import { Logger } from '../shared/logger'

type Config = {
    url: string
    token: string
    organisation: string
    bucket: string
}

export default class InfluxDBLogger implements Logger {
    #writeApi: WriteApi
    #queryApi: QueryApi
    #bucket: string

    constructor(config: Config) {
        const influxDB = new InfluxDB({
            url: config.url,
            token: config.token
        })
        this.#writeApi = influxDB.getWriteApi(config.organisation, config.bucket)
        this.#queryApi = influxDB.getQueryApi(config.organisation)
        this.#bucket = config.bucket
    }

    write(service: string, type: string, key: string, value: any, oldValue: any): void {
        // After a restart, the previous value needs to be fetched from the database
        if (oldValue == undefined)
            oldValue = this.getPreviousValue(service, type, key)

        if (value == oldValue)
            return

        const point = new Point(type)
            .tag('service_id', service)
            .tag('property', key)
            .floatField('value', value)

        this.#writeApi.writePoint(point)
    }

    async getPreviousValue(service: string, type: string, key: string): Promise<any> {
        const fluxQuery = `
            from(bucket: "${this.#bucket}")
            |> range(start: -30d)
            |> filter(fn: (r) => r._measurement == "${type}" and r.service_id == "${service}" and r.property == "${key}")
            |> last()
        `

        const result: any[] = await this.#queryApi.collectRows(fluxQuery)
        return result.length > 0 ? result[0]._value : null
    }
}
