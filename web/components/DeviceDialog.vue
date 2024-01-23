<template>
  <q-dialog>
    <q-card class="full-width">
      <q-card-section>
        <div class="text-h6">{{ deviceHelper.name() }}</div>
      </q-card-section>
      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="status">
          <ServicePanel v-for="service in device.services" :id="service" />
        </q-tab-panel>
        <q-tab-panel name="config">
          <ServicePanel v-for="service in device.services" :id="service" group="config" />
        </q-tab-panel>
        <q-tab-panel name="meta">
          <ServicePanel v-for="service in device.services" :id="service" group="meta" />
        </q-tab-panel>
      </q-tab-panels>
      <q-tabs v-model="tab" dense align="justify" narrow-indicator >
        <q-tab name="status" label="Status" />
        <q-tab name="config" label="Config" />
        <q-tab name="meta" label="About" />
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
</script>
