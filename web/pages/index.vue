<template>
  <q-page padding>
    <div class="q-pa-md row items-start">
      <DeviceButton class="col-xs-6 col-sm-3 col-md-2 col-lg-1" v-for="[key, device] in store.devices.entries()" :device="device" :key="key" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useStore } from '~~/stores/devices'

const store = useStore()
store.init()
</script>