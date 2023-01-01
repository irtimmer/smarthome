<template>
  <q-item>
    <q-item-section>
      <q-btn size="12px" flat dense @click="$emit('click', $event)">{{ action.label }}</q-btn>
    </q-item-section>
  </q-item>
</template>

<script setup>
defineProps(['action'])
defineEmits(['click'])
</script>
