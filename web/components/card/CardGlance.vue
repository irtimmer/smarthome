<template>
  <q-card class="row">
    <DeviceButton class="col-xs-6 col-sm-3 col-md-2 col-lg-1" v-for="device in entities" :device="device" :main="config.property" />
  </q-card>
</template>

<script setup lang="ts">
import { useStore } from '~~/stores/devices';

const props = defineProps<{
  config: any
}>()

const store = useStore()

const entities = computed(() => {
  const devices = Array.from(store.devices.values())
  let entities = props.config.entities.map((entity: string) => devices.find(device => device.identifiers.includes(entity))).filter((x: any) => x)
  return entities
})
</script>
