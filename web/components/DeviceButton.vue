<template>
  <q-card flat class="cursor-pointer q-hoverable" v-ripple @click="openDialog()">
    <span class="q-focus-helper"></span>
    <q-card-section class="text-center q-pa-sm">
      <div class="relative-position">
        <q-icon :name="icon" size="3em">
          <q-badge v-if="badge" style="box-sizing: border-box" :color="badge.color" floating rounded>
            <q-icon v-if="badge.icon" :name="badge.icon" />
          </q-badge>
        </q-icon>
      </div>
    </q-card-section>
    <q-card-section class="text-center q-pa-sm">
      <div>{{ name }}</div>
      <PropertyInput v-if="main.property" :property="main.property" :constraints="main.constraints" :modelValue="main.value" @update:modelValue="store.update(main.service, main.key, $event)"/>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { DeviceDialog } from '#components'
import { type Device, useStore } from '~~/stores/devices';

const props = defineProps<{
  device: Device
  main?: string
}>()

const { main: getMain, name: getName, icon: getIcon, badge: getBadge } = useDevice(props.device)
const $q = useQuasar()
const store = useStore()

const name = computed(() => getName())
const icon = computed(() => getIcon())
const badge = computed(() => getBadge())

const main = computed(() => {
    const [serviceId, propertyId] = getMain(props.main)
    return {
      service: serviceId,
      key: propertyId,
      property: store.services.get(serviceId)?.properties[propertyId],
      value: store.services.get(serviceId)?.values[propertyId],
      constraints: store.constraints.get(serviceId)?.[propertyId]
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