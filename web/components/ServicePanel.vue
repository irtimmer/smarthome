<template>
  <q-list dense>
    <PropertyItem v-for="(prop, key) in service.properties" :property="prop" :modelValue="service.values[key]" @update:modelValue="store.update(id, key, $event)" />
  </q-list>
</template>

<script setup>
import { useStore } from '~/stores/devices';

const props = defineProps(["id"])

const store = useStore()
const service = computed(() => store.services.get(props.id))
</script>
