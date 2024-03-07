<template>
  <span v-if="property.type == 'number' && property.logical_type == 'timestamp'">{{ new Date(value * 1000).toLocaleString() }}</span>
  <span v-else-if="property.type == 'number'">{{ value }}<span v-if="property.unit"> {{ property.unit }}</span></span>
  <span v-else>{{ value }}</span>
</template>

<script setup lang="ts">
import { type Property } from '~~/stores/devices';

defineProps<{
  value: any,
  property: Property
}>()
</script>
