<template>
  <q-card flat class="cursor-pointer q-hoverable" v-ripple @click="openDialog()">
    <span class="q-focus-helper"></span>
    <q-card-section class="text-center q-pa-sm">
      <q-icon :name="icon" size="3em" />
    </q-card-section>
    <q-card-section class="text-center q-pa-sm">
      {{ name }}
    </q-card-section>
  </q-card>
</template>

<script setup>
import { DeviceDialog } from '#components'

const props = defineProps(["device"])

const { value, name: getName, icon: getIcon } = useDevice(props.device)
const $q = useQuasar()

const name = computed(() => getName())
const icon = computed(() => getIcon())

function openDialog() {
  $q.dialog({
    component: DeviceDialog,
    componentProps: {
      device: props.device
    }
  })
}
</script>