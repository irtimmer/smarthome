<template>
  <span v-if="property.type == 'number'">{{ value }}<span v-if="property.unit"> {{ property.unit }}</span></span>
  <span v-else>{{ value }}</span>
</template>

<script setup>
defineProps(["value", "property"])
</script>
