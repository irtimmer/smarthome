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
  const devices = Array.from(store.devices.values())
  let entities = props.config.entities.map((entity: string) => devices.find(device => device.identifiers.includes(entity))).filter((x: any) => x)
  return entities
})
</script>
