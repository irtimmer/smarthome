<template>
  <PropertyValue v-if="property.read_only" :value="modelValue" :property="property" />
  <q-toggle v-else-if="property.type == 'boolean'" :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)"></q-toggle>
  <PropertyValue v-else :value="modelValue" :property="property" />
</template>

<script setup>
defineProps(['modelValue', 'property'])
defineEmits(['update:modelValue'])
</script>
