<template>
  <q-page padding>
    <q-toolbar class="text-primary">
      <q-btn-toggle unelevated v-model="layout" toggle-color="primary" :options="[
        {icon: 'mdi-view-comfy', value: 'cards'},
        {icon: 'mdi-view-list', value: 'list'}
      ]"/>
      <q-btn-toggle unelevated v-model="grouping" toggle-color="primary" :options="[
        {icon: 'mdi-group', value: 'group'},
        {icon: 'mdi-ungroup', value: 'ungroup'}
      ]"/>
    </q-toolbar>
    <div v-if="grouping == 'group'" class="q-gutter-md">
      <div v-for="[_, group] in deviceGroups.entries()">
        <div class="text-h6">{{ group.name }}</div>
        <div v-if="layout == 'cards'" class="row items-start">
          <DeviceButton class="col-xs-6 col-sm-3 col-md-2 col-lg-1" v-for="[key, device] in group.devices" :device="device" :key="key" />
        </div>
        <q-list v-else-if="layout == 'list'">
          <DeviceItem v-for="[key, device] in group.devices" :device="device" :key="key" />
        </q-list>
      </div>
    </div>
    <div v-else-if="layout == 'cards'" class="row items-start">
      <DeviceButton class="col-xs-6 col-sm-3 col-md-2 col-lg-1" v-for="[key, device] in store.devices.entries()" :device="device" :key="key" />
    </div>
    <q-list v-else-if="layout == 'list'">
      <DeviceItem v-for="[key, device] in store.devices.entries()" :device="device" :key="key" />
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import { type Device, useStore } from '~~/stores/devices'

const store = useStore()
store.init()

type DeviceGroup = {
  device: any
  name: string
  devices: [string, Device][]
}

const deviceGroups = computed(() => {
  const groupedDevices = new Set
  let groups = new Map<string, DeviceGroup>()
  for (const [key, device] of store.devices.entries()) {
    const { services, value, name: getName } = useDevice(device)
    const groupServices = services().filter(([_, service]) => service.types.includes('room'))
    if (groupServices.length > 0) {
      const ids = value('children') ?? []
      const devices = Array.from(store.devices.entries()).filter(([_, dev]) => dev.identifiers.find(x => ids.includes(x)))

      groupedDevices.add(device)
      devices.forEach(([_, dev]) => groupedDevices.add(dev))
      groups.set(key, {
        device,
        name: getName(),
        devices
      })
    }
  }
  groups.set('ungrouped', {
    device: null,
    name: 'Ungrouped',
    devices: Array.from(store.devices.entries()).filter(([_, dev]) => !groupedDevices.has(dev))
  })

  return groups
})

const layout = ref('cards')
const grouping = ref('group')
</script>