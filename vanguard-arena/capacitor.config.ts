import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myanrena.game',
  appName: 'VanguardArena',
  webDir: 'dist',
  bundledWebRuntime: false,
  // အောက်က server အပိုင်းကို ထပ်ထည့်ပါ
  server: {
    url: 'https://သင့်ရဲ့-vercel-link.vercel.app', // သင့် Vercel Live Link အမှန်ကို ထည့်ပါ
    cleartext: true
  }
};

export default config;
