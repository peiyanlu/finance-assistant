import './index.css'
import { createApp } from 'vue'
import App from './App.vue'
import SvgIcon from './components/SvgIcon.vue'
import router from './router'
import '@varlet/touch-emulator'
import '@varlet/ui/es/style.mjs'
import 'virtual:svg-icons-register'
// if you just want to import css
import 'element-plus/theme-chalk/dark/css-vars.css'
import './theme/index'

import zhCn from 'element-plus/es/locale/lang/zh-cn'
import ElementPlus from 'element-plus'



createApp(App)
  .use(router)
  .component('svg-icon', SvgIcon)
  .use(ElementPlus, {
    locale: zhCn,
  })
  .mount('#app')

console.log('👋 This message is being logged by "renderer.ts", included via Vite')
