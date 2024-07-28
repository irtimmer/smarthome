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
      </q-tab-panels>
      <q-tabs v-model="tab" dense align="justify" narrow-indicator >
        <q-tab v-for="t in tabs" :name="t.name" :label="t.label" />
      </q-tabs>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { type Device } from '~~/stores/devices'

const props = defineProps<{
  device: Device
}>()
const deviceHelper = useDevice(props.device)

const tab = ref('status')
const tabs = computed(() => {
  const tabs = [{ name: 'status', label: 'Status' }]
  if (deviceHelper.services().find(([_, s]) => s.group === 'control'))
    tabs.push({ name: 'control', label: 'Control', group: 'control' })

  if (deviceHelper.services().find(([_, s]) => s.group === 'config'))
    tabs.push({ name: 'config', label: 'Config', group: 'config' })

  if (deviceHelper.services().find(([_, s]) => s.group === 'meta'))
    tabs.push({ name: 'meta', label: 'About', group: 'meta' })

  return tabs
})

const services = deviceHelper.services()
</script>
