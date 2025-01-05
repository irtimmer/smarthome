<template>
  <component class="col" :is="components[config.card.type]" :config="subConfig"/>
</template>

<script setup lang="ts">
import type { ConcreteComponent } from 'vue';
import { useStore } from '~~/stores/devices';

const props = defineProps<{
  config: any
  components: Record<string, string | ConcreteComponent>
}>()

const store = useStore()
const { devices } = storeToRefs(store)

const subConfig = computed(() => {
    return {
    ...props.config.card,
    ...{
        entities: filterDevices(devices, props.config.filter)
    }
}})
</script>
