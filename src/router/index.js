import Vue from 'vue'
import VueRouter from 'vue-router'
import { toolRoutes } from './toolRoutes'

Vue.use(VueRouter)

const Home = () => import(/* webpackChunkName: "home" */ '../views/Home.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  ...toolRoutes
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  scrollBehavior() {
    return { x: 0, y: 0 }
  }
})

export default router
