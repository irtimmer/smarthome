<template>
  <q-card flat class="sh-button-card cursor-pointer q-hoverable">
    <q-card-section class="text-center q-pa-sm">
      <q-icon :name="icon" size="3em" />
    </q-card-section>
    <q-card-section class="text-center q-pa-sm">
      {{ name }}
    </q-card-section>
  </q-card>
</template>

<style lang="sass" scoped>
.sh-button-card
  width: 100%
  max-width: 150px
</style>

<script setup>
const props = defineProps(["device"])

const { value, icon: getIcon } = useDevice(props.device)
const name = computed(() => value("name"))
const icon = computed(() => getIcon())
</script>