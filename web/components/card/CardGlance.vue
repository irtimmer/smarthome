<template>
  <q-card class="row">
    <DeviceButton class="col-xs-6 col-sm-3 col-md-2 col-lg-1" v-for="device in entities" :device="device" />
  </q-card>
</template>

<script setup lang="ts">
import { useStore } from '~~/stores/devices';

const props = defineProps<{
  config: any
}>()

const store = useStore()

const entities = computed(() => {
  let entities = []
  for (const [_, device] of store.devices.entries()) {
    for (const entity of props.config.entities) {
      if (device.identifiers.includes(entity))
        entities.push(device)
    }
  }
  return entities
})
</script>
