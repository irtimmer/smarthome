# SmartHome

NO SUPPORT WILL BE PROVIDED FOR SETTING UP HARWARE OR API'S

SmartHome is a simple SmartHome application written in TypeScript.
It consists of two parts, an API server and a Nuxt (Vue) web interface.

NOTE: there is currently no authentication implemented

## Providers
The following hardware and api's are supported by SmartHome.
Lots of pairing and authentication code is not included (yet).

- Android TV using Remote v2 API (requires certificate creation and manually pairing)
- Denon over Telnet
- HeatBooster from [SDR Engineering][sdr] over HTTP
- Hue (requires manually provided API key)
- Hue Genesis (Hue Spotify integration) (requires manually provided API key)
- Ista Netherlands
- OpenMeteo
- Philips Television (requires manually provided authentication username and password)
- [Slide][slide] (requires username and password)
- Spotify (requires manually provided OAuth token and API keys)
- suncalc (just a library for calculating the sun position)
- TeslaMate over MQTT (requires MQTT server)
- Unifi
- ZWave (requires usb dongle)

[slide]: https://slide.store
[sdr]: https://www.sdr-engineering.nl

## History
History of values can be stored in:

- InfluxDB v2

## Build
To build the API server and the web UI run the commands
```
npx tsc
cd web
npm run build
```

## Run
For configuration you need to copy `config.example.yml` to `config.yml` and make the required changes for your setup.

To start the API server run the command
```
node dist/server/main.js
```

To start the Web UI run the command
```
cd web
node web/.output/server/index.mjs
```

## Copyright and license
Copyright 2023 Iwan Timmer.
Distributed under the GNU AGPL v3.
For full terms see the [COPYING](COPYING) file