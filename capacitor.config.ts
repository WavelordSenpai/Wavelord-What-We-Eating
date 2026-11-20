import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wavelord.whatweeating',
  appName: 'What We Eating?',
  webDir: 'www',
  backgroundColor: '#0f0f12',
  server: {
    androidScheme: 'https'
  }
};

export default config;
