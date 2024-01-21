<template>
  <q-page padding>
    <q-toolbar class="text-primary">
      <q-btn-toggle unelevated v-model="layout" toggle-color="primary" :options="[
        {icon: 'mdi-view-comfy', value: 'cards'},
        {icon: 'mdi-view-list', value: 'list'}
      ]"/>
    </q-toolbar>
    <div v-if="layout == 'cards'" class="row items-start">
      <DeviceButton class="col-xs-6 col-sm-3 col-md-2 col-lg-1" v-for="[key, device] in store.devices.entries()" :device="device" :key="key" />
    </div>
    <q-list v-else-if="layout == 'list'">
      <DeviceItem v-for="[key, device] in store.devices.entries()" :device="device" :key="key" />
    </q-list>
  </q-page>
</template>

<script setup lang="ts">
import { useStore } from '~~/stores/devices'

const store = useStore()
store.init()

const layout = ref('cards')
</script>