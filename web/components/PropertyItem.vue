<template>
  <q-item v-if="property.type == 'services'">
    <q-item-section>
      <q-item-label>{{ property.label }}</q-item-label>
      <div class="row items-start">
        <DeviceButton class="col-xs-6 col-sm-3" v-for="[key, device] in devices" :device="device" :key="key" />
      </div>
    </q-item-section>
  </q-item>
  <q-item v-else-if="constraintProperty.read_only">
    <q-item-section>{{ property.label }}</q-item-section>
    <q-item-section side>
      <PropertyValue :value="modelValue" :property="property" />
    </q-item-section>
  </q-item>
  <q-item v-else-if="property.type == 'number' && property.min != null && property.max != null">
    <q-item-section>
      <q-field borderless :label="property.label" :modelValue="modelValue">
        <template v-slot:control>
          <q-slider :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" :min="property.min" :max="property.max" :step="property.step" :inner-min="constraintProperty.min" :inner-max="constraintProperty.max" :readonly="constraintProperty.read_only"/>
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
      <PropertyInput :property="property" :constraints="constraints" :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)"/>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { type Constraint, type Property, useStore } from '~~/stores/devices';

const store = useStore()
const props = defineProps<{
  modelValue: any,
  property: Property,
  constraints?: Constraint[] | undefined
}>()

defineEmits(['update:modelValue'])

const options = computed(() => Object.entries(props.property.options!).map(([value, label]) => ({
  label,
  value
})))

const devices = computed(() => Array.from(store.devices.entries()).filter(([_, dev]) => dev.identifiers.find(x => props.modelValue.includes(x))))

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
