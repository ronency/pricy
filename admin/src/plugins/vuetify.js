import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'pricyDark',
    themes: {
      pricyDark: {
        dark: true,
        colors: {
          background: '#0D0D0D',
          surface: '#141414',
          'surface-variant': '#1a1a1a',
          'surface-bright': '#1a1a1a',
          primary: '#00FF41',
          secondary: '#F2A900',
          accent: '#F2A900',
          error: '#FF5252',
          info: '#2196F3',
          success: '#00FF41',
          warning: '#F2A900',
          'on-background': '#FFFFFF',
          'on-surface': '#FFFFFF',
          'on-primary': '#000000',
          'on-secondary': '#000000'
        }
      }
    }
  }
});
