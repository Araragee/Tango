import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { useAppStore, setupStorePersistence } from './stores/useStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Setup store persistence after pinia is installed
const store = useAppStore()
setupStorePersistence(store)

app.mount('#app')
