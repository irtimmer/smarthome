<template>
  <q-layout view="hHh lpr lff">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />
        <q-btn to="/" flat label="SmartHome" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" side="left" bordered>
      <q-list padding class="menu-list" v-if="uis">
        <q-item v-for="ui in uis" :to="'/ui/' + ui" clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="inbox" />
          </q-item-section>
          <q-item-section>{{ ui }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <slot />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
const leftDrawerOpen = ref(false)
function toggleLeftDrawer () {
    leftDrawerOpen.value = !leftDrawerOpen.value
}

const { data: uis } = await useFetch('/api/layouts', {
  server: false
})
</script>
