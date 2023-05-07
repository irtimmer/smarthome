<template>
  <q-page padding>
    <div class="q-pa-md row items-start q-gutter-md">
      <DeviceButton v-for="[key, device] in store.devices.entries()" :device="device" :key="key" />
    </div>
  </q-page>
</template>

<script setup>
import { useStore } from '~~/stores/devices'

const store = useStore()
store.init()
</script>