import { h } from 'vue';

export default {
  name: 'HomeView',
  props: {
    logoUrl: {
      type: String,
      default: '',
    },
  },
  emits: ['open-tab'],
  render() {
    return h('div', { class: 'home-landing' }, [
      h('h1', { class: 'home-title' }, 'Willkommen bei PSMSimple'),
      h('div', { class: 'home-logo-wrap' }, [
        h('img', {
          src: this.logoUrl,
          alt: 'PSMSimple Logo',
          class: 'home-logo',
        }),
      ]),
      h('a', {
        href: '/export',
        class: 'btn-home-cta',
        onClick: (event) => {
          event.preventDefault();
          this.$emit('open-tab', 'export', event.currentTarget);
        },
      }, [
        'Jetzt dokumentieren ',
        h('span', { class: 'cta-arrow' }, '→'),
      ]),
    ]);
  },
};
