<template>
  <q-dialog>
    <q-card class="full-width">
      <q-card-section>
        <div class="text-h6">{{ deviceHelper.name() }}</div>
      </q-card-section>
      <q-tab-panels v-model="tab" animated>
        <q-tab-panel v-for="t in tabs" :name="t.name">
          <ServicePanel v-for="[id, _] in services" :id="id" :group="t.group" />
        </q-tab-panel>
        <q-tab-panel name="services">
          <q-list>
            <q-item v-for="[id, service] in services" :key="id">
              <q-item-section>
                <q-item-label>{{ service.name }}</q-item-label>
                <q-item-label caption>
                  <div v-for="type in service.types">{{ type }}</div>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div>{{ id }}</div>
                <div v-for="identifier in service.identifiers">{{ identifier }}</div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
      <q-tabs v-model="tab" dense align="justify" narrow-indicator >
        <q-tab v-for="t in tabs" :name="t.name" :label="t.label" />
        <q-tab name="services" label="Services" />
      </q-tabs>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { type Device, type Service } from '~~/stores/devices'

const props = defineProps<{
  device: Device
}>()
const deviceHelper = useDevice(props.device)

const tab = ref('status')

function hasGroup(service: Service, group: string) {
  return Object.values(service.properties).find(p => p.group === group) ||
    Object.values(service.actions).find(p => p.group === group)
}

const tabs = computed(() => {
  const tabs = [{ name: 'status', label: 'Status' }]
  if (deviceHelper.services().find(([_, s]) => hasGroup(s, 'control')))
    tabs.push({ name: 'control', label: 'Control', group: 'control' })

  if (deviceHelper.services().find(([_, s]) => hasGroup(s, 'config')))
    tabs.push({ name: 'config', label: 'Config', group: 'config' })

  if (deviceHelper.services().find(([_, s]) => hasGroup(s, 'meta')))
    tabs.push({ name: 'meta', label: 'About', group: 'meta' })

  return tabs
})

const services = deviceHelper.services()
</script>
