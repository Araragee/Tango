import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAppStore, setupStorePersistence } from './stores/useStore'
import { useAuthStore } from './stores/useAuthStore'
import { useHouseholdStore } from './stores/useHouseholdStore'
import { isConfigured } from './lib/supabase'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const store = useAppStore()
setupStorePersistence(store)

// Init auth + household before router resolves first navigation
if (isConfigured) {
  const auth = useAuthStore()
  const household = useHouseholdStore()
  auth.init().then(() => {
    if (auth.user) household.load()
  })
}

app.mount('#app')
