<template>
  <q-list dense>
    <PropertyItem v-for="(prop, key) in visibleProperties" :property="prop" :modelValue="service.values[key]" @update:modelValue="store.update(id, key, $event)" />
    <ActionItem v-for="(action, key) in visibleActions" :action="action" @click="store.triggerAction(id, key)" />
  </q-list>
</template>

<script setup>
import { useStore } from '~/stores/devices';

const props = defineProps(["id", "group"])

const store = useStore()
const service = computed(() => store.services.get(props.id))
const visibleProperties = computed(() => service.value.properties && Object.fromEntries(Object.entries(service.value.properties).filter(([_, prop]) => prop.group === props.group)))
const visibleActions = computed(() => service.value.actions && Object.fromEntries(Object.entries(service.value.actions).filter(([_, action]) => action.group === props.group)))
</script>
