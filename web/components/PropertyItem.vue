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
  <div v-else-if="property.type == 'services'">
    {{ property.label }}
    <div class="row items-start">
      <DeviceButton class="col-xs-6 col-sm-3" v-for="[key, device] in devices" :device="device" :key="key" />
    </div>
  </div>
  <q-item v-else>
    <q-item-section>{{ property.label }}</q-item-section>
    <q-item-section side>
      <PropertyInput :property="property" :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)"/>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { Property, useStore } from '~~/stores/devices';

const store = useStore()
const props = defineProps<{
  modelValue: any,
  property: Property
}>()

defineEmits(['update:modelValue'])

const options = computed(() => Object.entries(props.property.options!).map(([value, label]) => ({
  label,
  value
})))

const devices = computed(() => Array.from(store.devices.entries()).filter(([_, dev]) => dev.identifiers.find(x => props.modelValue.includes(x))))
</script>
