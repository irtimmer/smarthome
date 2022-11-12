<template>
  <q-page padding>
    <div class="q-pa-md row items-start q-gutter-md">
      <DeviceButton v-for="device in store.devices.values()" :device="device" />
    </div>
  </q-page>
</template>

<script setup>
import { useStore } from '~~/stores/devices'

const store = useStore()
store.init()
</script>