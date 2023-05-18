<template>
  <q-card flat class="cursor-pointer q-hoverable" v-ripple @click="openDialog()">
    <span class="q-focus-helper"></span>
    <q-card-section class="text-center q-pa-sm">
      <q-icon :name="icon" size="3em" />
    </q-card-section>
    <q-card-section class="text-center q-pa-sm">
      <div>{{ name }}</div>
      <PropertyInput v-if="main.property" :property="main.property" :modelValue="main.value" @update:modelValue="store.update(main.service, main.key, $event)"/>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { DeviceDialog } from '#components'
import { useStore } from '~~/stores/devices';

const props = defineProps(["device"])

const { value, main: getMain, name: getName, icon: getIcon } = useDevice(props.device)
const $q = useQuasar()
const store = useStore()

const name = computed(() => getName())
const icon = computed(() => getIcon())

const main = computed(() => {
    const [serviceId, propertyId] = getMain()
    return {
      service: serviceId,
      key: propertyId,
      property: store.services.get(serviceId)?.properties[propertyId],
      value: store.services.get(serviceId)?.values[propertyId]
    }
})

function openDialog() {
  $q.dialog({
    component: DeviceDialog,
    componentProps: {
      device: props.device
    }
  })
}
</script>