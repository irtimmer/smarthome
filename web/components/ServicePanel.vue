<template>
  <q-list dense>
    <template v-for="(prop, key) in visibleProperties">
      <PropertyItem v-if="!prop.hide_null || (service.values[key] == null)" :property="prop" :modelValue="service.values[key]" @update:modelValue="store.update(id, key as string, $event)" />
    </template>
    <q-item v-if="Object.keys(visibleActions).length">
      <q-item-section>
        <q-btn-group flat dense spread>
          <q-btn v-for="(action, key) in visibleActions" size="12px" flat dense @click="store.triggerAction(id, key as string)">{{ action.label }}</q-btn>
        </q-btn-group>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useStore } from '~/stores/devices';

const props = defineProps<{
  id: string,
  group: string
}>()

const store = useStore()
const service = computed(() => store.services.get(props.id)!)
const visibleProperties = computed(() => service.value.properties && Object.fromEntries(Object.entries(service.value.properties).filter(([_, prop]) => prop.group === props.group)))
const visibleActions = computed(() => service.value.actions && Object.fromEntries(Object.entries(service.value.actions).filter(([_, action]) => action.group === props.group)))
</script>
