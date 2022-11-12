export default defineNuxtConfig({
    build: {
        transpile: ['quasar']
    },
    modules: [
        'nuxt-quasar-vite',
        '@nuxtjs-alt/proxy',
        '@pinia/nuxt'
    ],
    components: true,
    proxy: {
        enableProxy: true,
        fetch: true,
        proxies: {
            '/api': 'http://localhost:3000'
        }
    },
    quasar: {
        css: ['@quasar/extras/material-icons/material-icons.css', '@quasar/extras/mdi-v7/mdi-v7.css'],
        plugins: [
            'Dialog'
        ]
    },
    typescript: {
        strict: true
    }
})
