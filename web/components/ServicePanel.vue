<template>
  <div>
    <div class="text-h6">{{ service.name }}</div>
    <q-list>
      <q-item v-for="(prop, key) in service.properties">
        <q-item-section>{{ prop.label }}</q-item-section>
        <q-item-section side>
          <PropertyInput :property="prop" :modelValue="service.values[key]" @update:modelValue="store.update(id, key, $event)"/>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import { useStore } from '~/stores/devices';

const props = defineProps(["id"])

const store = useStore()
const service = computed(() => store.services.get(props.id))
</script>
