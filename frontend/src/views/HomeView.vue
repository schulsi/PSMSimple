<template>
  <div class="home-landing">
    <h1 class="home-title">Willkommen bei PSMSimple</h1>
    <div class="home-logo-wrap">
      <img :src="logoUrl" alt="PSMSimple Logo" class="home-logo">
    </div>
    <Button class="btn-home-cta p-button-secondary" as="a" href="/export" @click.prevent="emitOpenTab">
      Jetzt dokumentieren <span class="cta-arrow">→</span>
    </Button>
  </div>
</template>

<script>
import Button from 'primevue/button';

export default {
  name: 'HomeView',
  components: {
    Button,
  },
  props: {
    logoUrl: {
      type: String,
      default: '',
    },
  },
  emits: ['open-tab'],
  methods: {
    emitOpenTab(event) {
      this.$emit('open-tab', 'export', event.currentTarget);
    },
  },
};
</script>
