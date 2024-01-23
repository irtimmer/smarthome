<template>
  <span v-if="property.type == 'number'">{{ value }}<span v-if="property.unit"> {{ property.unit }}</span></span>
  <span v-else>{{ value }}</span>
</template>

<script setup lang="ts">
import { type Property } from '~~/stores/devices';

defineProps<{
  value: any,
  property: Property
}>()
</script>
