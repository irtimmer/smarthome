<template>
  <div class="row q-gutter-md">
    <component v-for="card in config.cards" class="col" :is="components[card.type]" :config="card"/>
  </div>
</template>

<script setup lang="ts">
import type { ConcreteComponent } from 'nuxt/dist/app/compat/capi';

defineProps<{
  config: any,
  components: Record<string, string | ConcreteComponent>
}>()
</script>
