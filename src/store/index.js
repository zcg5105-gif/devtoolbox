import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const STORAGE_KEY = 'devtoolbox-theme'

function getStoredTheme() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch (error) {
    return null
  }
}

function persistTheme(mode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch (error) {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
}

function applyTheme(mode) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

const theme = {
  namespaced: true,
  state: {
    mode: getStoredTheme() || 'light'
  },
  getters: {
    isDark: state => state.mode === 'dark'
  },
  mutations: {
    SET_THEME(state, mode) {
      state.mode = mode
      persistTheme(mode)
      applyTheme(mode)
    }
  },
  actions: {
    initTheme({ state }) {
      applyTheme(state.mode)
    },
    setTheme({ commit }, mode) {
      commit('SET_THEME', mode === 'dark' ? 'dark' : 'light')
    },
    toggleTheme({ commit, state }) {
      commit('SET_THEME', state.mode === 'dark' ? 'light' : 'dark')
    }
  }
}

const store = new Vuex.Store({
  modules: {
    theme
  }
})

export default store
