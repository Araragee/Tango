# Tango 💃🕺

Tango is a premium, modern co-management web application designed for couples. It helps partners coordinate their shared finances, savings goals, daily tasks, and calendar events in real time, featuring offline-first capabilities, a pixel-art theme, and a responsive mobile-first design.

---

## 🌟 Key Modules & Features

### 1. 💰 Budget & Expenses
- **Shared Transaction Ledger**: Log income and expenses with notes and attachment support (receipt upload to Supabase Storage).
- **Custom Categories**: Assign budgets per category and configure custom emojis for visual clarity.
- **Settle-Up Balance**: Split transactions and track who paid what (`paid_by`), automatically calculating the net balance between partners.
- **Budget Tracking & Analytics**: Interactive budget bars reflecting monthly category spending and limits.
- **CSV Bank Statement Import**: Parse bank CSVs with automatic column mapping, parse previews, and bulk import.
- **Export data**: Download full transaction histories as CSVs.

### 2. 🎯 Savings Goals & Plans
- **Dynamic Savings Goals**: Set target goals with deadlines and automated remaining-day counters.
- **DuoBar Split**: Interactive visualization showing individual contributions from both partners.
- **Income Auto-Allocate**: Configure a percentage-based auto-allocation rule for saving.
- **Upcoming Nudges**: In-app 7-day warnings for target goals close to their deadlines.

### 3. 📋 Shared To-Dos
- **Real-Time Task Lists**: Track shared checklists with categories and due dates.
- **Smart Handoff**: Instantly assign or pass off tasks to your partner.
- **Shared Shopping List**: A dedicated, quick-access tab for collaborative shopping.
- **Recurring To-Dos**: Auto-generate the next occurrence of a chore upon completion.
- **Phrase of the Day**: A deterministic daily phrase shared between partners, computed client-side.

### 4. 📅 Calendar & Date Nights
- **Shared Calendar View**: Co-manage calendar events by category.
- **Date Night Planner**: Access a curated idea list with structured planning prompts.
- **Post-Date Reviews**: Save mood ratings and reviews for past events to feed into a monthly couple's report.
- **External Export**: Export calendar events to `.ics` format.

### 5. 🎮 Engagement & Fun
- **Streaks & Achievements**: Earn badges and track streaks as a team for financial goals and task completions.
- **Sprite Characters**: Dynamic 16-bit sprite animations reflecting the couple's active budget status and vibe.

---

## 🛠 Tech Stack

- **Core**: HTML5, Vanilla CSS, TypeScript
- **Frontend Framework**: [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **State Management**: [Pinia](https://pinia.vuejs.org/) with `pinia-plugin-persistedstate` (IndexedDB fallback via `useReadCache`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend as a Service**: [Supabase](https://supabase.com/) (PostgreSQL database, Auth, Storage, Edge Functions, Realtime Channels)
- **PWA & Offline**: Custom Service Worker (`sw.ts`) using VitePWA, local IndexedDB write queue (`useOfflineQueue`) for syncing mutations upon reconnect, and aggressive local read caching.
- **Build Tool**: [Vite](https://vitejs.dev/)

---

## 📂 Project Structure

```text
.
├── docs/                      # Consolidated project documentation
│   └── user-stories.md        # Active product roadmap, personas, and story checklists
├── front-end/                 # Vue 3 Application
│   ├── public/                # PWA static assets & manifest configurations
│   ├── scripts/               # Utility scripts (e.g. PWA icon generation)
│   ├── src/                   # Vue 3 source code
│   │   ├── assets/            # Logos and stylesheets
│   │   ├── components/        # Shared UI elements & view components
│   │   ├── composables/       # Vue composables (theme, idle state, PWA updates)
│   │   ├── lib/               # Third-party initializations (Supabase client)
│   │   ├── router/            # Route configuration and middleware
│   │   ├── stores/            # Pinia stores (auth, budget, presence, notifications)
│   │   ├── types/             # TypeScript database & component interfaces
│   │   └── utils/             # Helper utilities (date formatting, achievements logic)
│   ├── tsconfig.json          # TypeScript configurations
│   └── vite.config.ts         # Vite configuration with PWA integration
├── supabase/                  # Backend configurations
│   ├── functions/             # Edge Functions (e.g. dispatch_push notifications)
│   ├── migrations/            # SQL migration scripts (001 to 021)
│   └── schema.sql             # SQL database schema snapshot
├── netlify.toml               # Netlify build configurations and security headers
└── README.md                  # Project overview (this file)
```

---

## 🚀 Getting Started

### 📋 Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)

### 💻 Local Development Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd Tango
   ```

2. **Configure Environment Variables**:
   In `front-end/`, copy the example environment file and configure your local Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   *Note: If environment variables are not configured, Tango automatically launches in **Local Demo / Guest Mode** (using mock data for "Dave & Joanna"), allowing full offline assessment.*

3. **Install Dependencies**:
   Navigate to the `front-end` directory and run:
   ```bash
   cd front-end
   npm install
   ```

4. **Start the Dev Server**:
   ```bash
   npm run dev
   ```
   The application will run locally at `http://localhost:5173`.

### 🧪 Running Tests
Unit tests for Pinia stores, helper utilities, date math, and the `App.vue` mounting lifecycle are written using **Vitest**.
To run the test suite:
```bash
npm run test
```

### 📦 Production Build & PWA Testing
Build and preview the production bundle to inspect PWA Service Worker caching and redirection logic:
```bash
npm run build
npm run preview
```

---

## 📚 Documentation Links
For deep technical insights and roadmap information, consult the `docs/` folder:
- 🗺️ **[User Stories Roadmap](file:///Users/dex/Desktop/Essentials%20x%20Coding/Tango/docs/user-stories.md)**: Product epics, stories, and status checklist.
