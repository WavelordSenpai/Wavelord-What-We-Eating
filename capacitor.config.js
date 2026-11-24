// Capacitor config - JS only. No TypeScript.
const config = {
  appId: 'com.wavelord.whatweeating',
  appName: 'What We Eating?',
  webDir: 'www',
  backgroundColor: '#0f0f12',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

module.exports = config;
