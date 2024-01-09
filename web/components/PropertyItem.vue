<template>
  <q-item v-if="property.type == 'number' && !property.read_only && property.min != null && property.max != null">
    <q-item-section>
      <q-field borderless :label="property.label" :modelValue="modelValue">
        <template v-slot:control>
          <q-slider :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" :min="property.min" :max="property.max" :readonly="property.read_only"/>
        </template>
      </q-field>
    </q-item-section>
    <q-item-section side>
      {{ modelValue }}
    </q-item-section>
  </q-item>
  <q-item v-else-if="property.type == 'enum'">
    <q-item-section>
      <q-select dense emit-value map-options borderless :label="property.label" :options="options" :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" />
    </q-item-section>
  </q-item>
  <q-item v-else>
    <q-item-section>{{ property.label }}</q-item-section>
    <q-item-section side>
      <PropertyInput :property="property" :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)"/>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { Property } from '~~/stores/devices';

const props = defineProps<{
  modelValue: any,
  property: Property
}>()

defineEmits(['update:modelValue'])

const options = computed(() => Object.entries(props.property.options!).map(([value, label]) => ({
  label,
  value
})))
</script>
