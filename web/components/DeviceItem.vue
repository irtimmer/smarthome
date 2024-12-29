<template>
  <q-item clickable v-ripple @click="openDialog()">
    <q-item-section avatar>
      <q-icon :name="helper.icon()" />
    </q-item-section>
    <q-item-section>
      <q-item-label>
        {{ helper.name() }}
      </q-item-label>
      <q-item-label v-if="secondaries" caption>
        <span v-for="(secondary, index) in secondaries">
          <span v-if="index > 0"> - </span>
          {{ secondary.property['@type'] }}
          <PropertyValue :property="secondary.property" :value="secondary.value" />
        </span>
      </q-item-label>
    </q-item-section>
    <q-item-section v-if="main.property" side>
      <PropertyInput :property="main.property" :constraints="main.constraints" :modelValue="main.value" @update:modelValue="store.update(main.service, main.key, $event)"/>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { DeviceDialog } from '#components';
import { type Device, useStore } from '~~/stores/devices';
import PropertyInput from './PropertyInput.vue';

const props = defineProps<{
  device: Device
  main?: string
}>()
const store = useStore()

const helper = useDevice(props.device)
const main = computed(() => {
    const [serviceId, propertyId] = helper.main(props.main)
    return {
        service: serviceId,
        key: propertyId,
        property: store.services.get(serviceId)?.properties[propertyId],
        value: store.services.get(serviceId)?.values[propertyId],
        constraints: store.constraints.get(serviceId)?.[propertyId]
    }
})

const secondaries = computed(() => {
  const mainPropertyId = main.value.key
  if (!mainPropertyId) return []

  return helper.secondaries().filter(([_, propertyId]) => mainPropertyId != propertyId).map(([serviceId, propertyId]) => ({
    property: store.services.get(serviceId)?.properties[propertyId],
    value: store.services.get(serviceId)?.values[propertyId]
  }))
})

const $q = useQuasar()
function openDialog() {
  $q.dialog({
    component: DeviceDialog,
    componentProps: {
      device: props.device
    }
  })
}
</script>