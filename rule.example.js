lights.set("on", false, "default", 0)

watch(() => {
    if (sensor.presence)
        lights.set("on", true, "motion", 10, {
            keep: config.keep_on * 60 * 1000
        })
})

const lightOnThreshold = config.daylight_level ?? 16000
const lightOffThreshold = config.dark_level ?? 20000
watch(() => {
    const lightThreshold = lights.on ? lightOffThreshold : lightOnThreshold
    if (sensor.lightlevel > lightThreshold)
        lights.set("on", false, "bright", 50, {
            keep: 60 * 1000
        })
})
