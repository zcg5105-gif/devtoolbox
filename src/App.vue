<template>
  <div id="app">
    <DefaultLayout />
  </div>
</template>

<script>
import DefaultLayout from './layouts/DefaultLayout.vue'
import { injectSpeedInsights } from '@vercel/speed-insights'

export default {
  name: 'App',
  components: {
    DefaultLayout
  },
  mounted() {
    // Initialize Vercel Speed Insights
    injectSpeedInsights()
  }
}
</script>
