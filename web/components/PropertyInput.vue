<template>
  <PropertyValue v-if="property.read_only" :value="modelValue" :property="property" />
  <q-input v-else-if="property.type == 'number'" :modelValue="modelValue" borderless :min="property.min" :max="property.max" type="number" dense />
  <q-toggle v-else-if="property.type == 'boolean'" :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)"></q-toggle>
  <PropertyValue v-else :value="modelValue" :property="property" />
</template>

<script setup>
defineProps(['modelValue', 'property'])
defineEmits(['update:modelValue'])
</script>
