<template>
  <q-dialog>
    <q-card>
      <q-tabs v-model="tab" inline-label :breakpoint="0" align="justify" class="bg-purple text-white shadow-2">
        <q-tab v-for="service in device.services" :name="service" :label="store.services.get(service).name" />
      </q-tabs>
      <q-tab-panels v-model="tab" animated>
        <q-tab-panel v-for="service in device.services" :name="service">
          <ServicePanel :id="service" />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useStore } from '~/stores/devices'

const props = defineProps(["device"])

const store = useStore()

const tab = ref(props.device.services[0])
</script>
