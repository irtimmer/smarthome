<template>
  <q-card>
    <q-card-section>
      <div class="text-h6">{{ config.title }}</div>
    </q-card-section>
    <q-list>
      <DeviceItem v-for="device in entities" :device="device" />
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
import { useStore } from '~~/stores/devices';
import DeviceItem from '../DeviceItem.vue';

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
