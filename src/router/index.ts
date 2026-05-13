import { createRouter, createWebHashHistory } from 'vue-router'


export default createRouter({
  // electron 不要使用 [createWebHistory]
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/DocFinder.vue'),
    },
  ],
})
