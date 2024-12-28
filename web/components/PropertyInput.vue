<template>
  <PropertyValue v-if="constraintProperty.read_only" :value="modelValue" :property="property" />
  <q-input v-else-if="property.type == 'number'" :modelValue="modelValue" borderless :min="constraintProperty.min" :max="constraintProperty.max" type="number" dense />
  <q-toggle dense v-else-if="property.type == 'boolean'" :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)"></q-toggle>
  <span v-else-if="property.type == 'string'">
    <PropertyValue :value="modelValue" :property="property" />
    <q-popup-edit :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" :title="property.label" auto-save v-slot="scope">
      <q-input v-model="scope.value" dense autofocus @keyup.enter="scope.set" />
    </q-popup-edit>
  </span>
  <PropertyValue v-else :value="modelValue" :property="property" />
</template>

<script setup lang="ts">
import { type Constraint, type Property } from '~~/stores/devices';

const props = defineProps<{
  modelValue: any,
  property: Property,
  constraints: Constraint[] | undefined
}>()
defineEmits(['update:modelValue'])

const constraintProperty = computed(() => props.constraints?.reduce((property, constraint) => {
  switch(constraint.action) {
    case ConstraintAction.MINIMUM:
      property.min = constraint.value
      break
    case ConstraintAction.MAXIMUM:
      property.max = constraint.value
      break
    case undefined:
    case null:
      property.read_only = true
  }
  return property
}, { ...props.property }) ?? props.property)
</script>
