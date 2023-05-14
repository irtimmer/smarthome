<template>
  <PropertyValue v-if="property.read_only" :value="modelValue" :property="property" />
  <q-input v-else-if="property.type == 'number'" :modelValue="modelValue" borderless :min="property.min" :max="property.max" type="number" dense />
  <q-toggle v-else-if="property.type == 'boolean'" :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)"></q-toggle>
  <span v-else-if="property.type == 'string'">
    <PropertyValue :value="modelValue" :property="property" />
    <q-popup-edit :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" :title="property.label" auto-save v-slot="scope">
      <q-input v-model="scope.value" dense autofocus @keyup.enter="scope.set" />
    </q-popup-edit>
  </span>
  <PropertyValue v-else :value="modelValue" :property="property" />
</template>

<script setup>
defineProps(['modelValue', 'property'])
defineEmits(['update:modelValue'])
</script>
