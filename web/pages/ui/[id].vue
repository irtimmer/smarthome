<template>
  <q-page padding class="q-gutter-md">
    <component v-for="card in config?.cards" :is="components[card.type]" :config="card" :components="components" />
  </q-page>
</template>

<script setup lang="ts">
import type { ConcreteComponent } from 'nuxt/dist/app/compat/capi';
import { useStore } from '~~/stores/devices'

const route = useRoute()
const store = useStore()
store.init()

const { data: config } = await useFetch(`/api/layout/${route.params.id}`, {
  server: false
})

const components: Record<string, string | ConcreteComponent> = {
  entities: resolveComponent("CardEntities"),
  glance: resolveComponent("CardGlance"),
  stack: resolveComponent("CardStack"),
  'entity-filter': resolveComponent("CardEntityFilter")
}
</script>
