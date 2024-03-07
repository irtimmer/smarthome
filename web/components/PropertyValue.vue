<template>
  <span v-if="property.type == 'number' && property.logical_type == 'timestamp'">{{ new Date(value * 1000).toLocaleString() }}</span>
  <span v-else-if="property.type == 'number'">{{ numberValue }}<span v-if="property.unit"> {{ property.unit }}</span></span>
  <span v-else>{{ value }}</span>
</template>

<script setup lang="ts">
import { type Property } from '~~/stores/devices';

const props = defineProps<{
  value: any,
  property: Property
}>()

const numberValue = computed(() => {
  const value = Number(props.value)
  if (Number.isNaN(value))
    return props.value
  else if (Number.isInteger(value))
    return value
  else if (value < 1 && value > -1)
    return value.toPrecision(2)
  else
    return value.toFixed(1)
})
</script>
