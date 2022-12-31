<template>
  <q-dialog>
    <q-card>
      <q-card-section>
        <div class="text-h6">{{ deviceHelper.value("name") }}</div>
      </q-card-section>
      <q-card-section>
        <ServicePanel v-for="service in device.services" :id="service" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
const props = defineProps(["device"])
const deviceHelper = useDevice(props.device)
</script>
