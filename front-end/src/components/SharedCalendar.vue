<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore, type CalendarEvent } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import NewEventSheet from './NewEventSheet.vue';

const store = useAppStore();
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const showEventSheet = ref(false);
const selectedDate = ref('');
const selectedEventId = ref<string | null>(null);
const calendarView = ref<'month' | 'week' | 'day'>('month');

const currentDate = ref(new Date());
const todayDate = new Date();
const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

// ── Helpers ────────────────────────────────────────────────────────────────

const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isDateToday = (d: Date) =>
  d.getFullYear() === todayDate.getFullYear() &&
  d.getMonth() === todayDate.getMonth() &&
  d.getDate() === todayDate.getDate();

const isToday = (day: number) =>
  isDateToday(new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), day));

const getEventsForDateStr = (ds: string) =>
  store.calendar.events.filter((e: CalendarEvent) => e.date === ds);

const getEventsForDay = (day: number) => {
  const ds = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return getEventsForDateStr(ds);
};

const getEventsForDate = (d: Date) => getEventsForDateStr(dateStr(d));

const eventColorClass = (category: string) => ({
  date: 'bg-primary-container text-on-primary-container',
  errand: 'bg-secondary-container text-on-secondary-container',
  bill: 'bg-tertiary-container text-on-tertiary-container',
} as Record<string, string>)[category] ?? 'bg-surface-variant text-on-surface';

// ── Month view ─────────────────────────────────────────────────────────────

const daysInMonth = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0).getDate());
const firstDayOffset = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1).getDay());

// ── Week view ──────────────────────────────────────────────────────────────

const weekDays = computed(() => {
  const d = new Date(currentDate.value);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
});

// ── Day view ───────────────────────────────────────────────────────────────

const dayEvents = computed(() => {
  const evts = getEventsForDateStr(dateStr(currentDate.value));
  return [...evts].sort((a, b) => {
    if (a.time === 'All Day') return -1;
    if (b.time === 'All Day') return 1;
    return a.time.localeCompare(b.time);
  });
});

// ── Period label ───────────────────────────────────────────────────────────

const periodLabel = computed(() => {
  if (calendarView.value === 'month') {
    return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' });
  }
  if (calendarView.value === 'week') {
    const s = weekDays.value[0];
    const e = weekDays.value[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleString('default', { month: 'long' })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${s.toLocaleString('default', { month: 'short' })} ${s.getDate()} – ${e.toLocaleString('default', { month: 'short' })} ${e.getDate()}, ${e.getFullYear()}`;
  }
  return currentDate.value.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
});

// ── Navigation ─────────────────────────────────────────────────────────────

const prevPeriod = () => {
  const d = new Date(currentDate.value);
  if (calendarView.value === 'month') {
    currentDate.value = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  } else if (calendarView.value === 'week') {
    d.setDate(d.getDate() - 7);
    currentDate.value = d;
  } else {
    d.setDate(d.getDate() - 1);
    currentDate.value = d;
  }
};

const nextPeriod = () => {
  const d = new Date(currentDate.value);
  if (calendarView.value === 'month') {
    currentDate.value = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else if (calendarView.value === 'week') {
    d.setDate(d.getDate() + 7);
    currentDate.value = d;
  } else {
    d.setDate(d.getDate() + 1);
    currentDate.value = d;
  }
};

const goToday = () => { currentDate.value = new Date(); };

// ── Event interactions ─────────────────────────────────────────────────────

const handleDayClick = (day: number) => {
  const ds = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  selectedDate.value = ds;
  selectedEventId.value = null;
  showEventSheet.value = true;
};

const handleWeekDayClick = (d: Date) => {
  currentDate.value = new Date(d);
  calendarView.value = 'day';
};

const openEventDetails = (event: CalendarEvent) => {
  selectedDate.value = event.date;
  selectedEventId.value = event.id;
  showEventSheet.value = true;
};

const openNewEventForDate = (ds: string) => {
  selectedDate.value = ds;
  selectedEventId.value = null;
  showEventSheet.value = true;
};

// ── Coming Up + Sync Score ─────────────────────────────────────────────────

const upcomingEvents = computed(() =>
  store.calendar.events
    .filter((e: CalendarEvent) => e.date >= todayStr)
    .sort((a: CalendarEvent, b: CalendarEvent) => a.date.localeCompare(b.date))
    .slice(0, 3)
);

const syncScore = computed(() => {
  const total = store.calendar.events.length;
  if (total === 0) return 0;
  const shared = store.calendar.events.filter((e: CalendarEvent) => e.partners.length > 1).length;
  return Math.round((shared / total) * 100);
});
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-lg lg:py-12 py-6 w-full">

    <!-- Header & Controls -->
    <section class="flex flex-col md:flex-row justify-between items-start md:items-center gap-md w-full">
      <div>
        <h2 class="text-headline-lg text-primary">{{ periodLabel }}</h2>
        <p class="text-body-md text-on-surface-variant">Syncing with {{ store.partnerName }}</p>
      </div>
      <div class="flex gap-2 flex-wrap items-center">
        <!-- View switcher -->
        <div class="flex pixel-border-sm overflow-hidden">
          <button v-for="v in [['month', 'Month'], ['week', 'Week'], ['day', 'Day']] as const" :key="v[0]"
            @click="calendarView = v[0]"
            class="px-3 py-1.5 text-label-sm uppercase transition-colors"
            :class="calendarView === v[0] ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'">
            {{ v[1] }}
          </button>
        </div>
        <!-- Nav -->
        <TangoButton @click="prevPeriod" variant="surface" size="md" class="w-10 h-10" aria-label="Previous">
          <span class="material-symbols-outlined">chevron_left</span>
        </TangoButton>
        <TangoButton @click="goToday" variant="surface" size="md" aria-label="Go to today">Today</TangoButton>
        <TangoButton @click="nextPeriod" variant="surface" size="md" class="w-10 h-10" aria-label="Next">
          <span class="material-symbols-outlined">chevron_right</span>
        </TangoButton>
        <TangoButton @click="showEventSheet = true" variant="primary" size="md" aria-label="New Event">
          <span class="material-symbols-outlined">add</span>
          New Event
        </TangoButton>
      </div>
    </section>

    <!-- ── MONTH VIEW ─────────────────────────────────────────────────── -->
    <TangoCard v-if="calendarView === 'month'" padding="none" shadow="default" class="bg-surface-container-lowest p-1 w-full">
      <div class="grid grid-cols-7 gap-xs text-center border-b-2 border-on-surface pb-sm mb-sm bg-surface">
        <div v-for="day in DAY_LABELS" :key="day" class="text-label-sm text-on-surface uppercase">{{ day }}</div>
      </div>
      <div class="grid grid-cols-7 gap-[1px] bg-surface-variant">
        <div v-for="i in firstDayOffset" :key="'e'+i" class="bg-surface-container-low min-h-[100px] p-xs"></div>
        <div
          v-for="day in daysInMonth" :key="day"
          class="min-h-[100px] p-xs relative border border-transparent hover:border-primary-container transition-colors cursor-pointer"
          :class="isToday(day) ? 'bg-primary-container' : 'bg-surface-container-lowest'"
          @click="handleDayClick(day)"
        >
          <span class="text-label-sm font-bold" :class="isToday(day) ? 'text-on-primary-container' : 'text-on-surface'">{{ day }}</span>
          <div
            v-for="event in getEventsForDay(day)" :key="event.id"
            @click.stop="openEventDetails(event)"
            class="mt-xs text-[10px] p-[2px] pixel-border-sm font-bold truncate leading-none flex items-center gap-[1px] hover:opacity-80 transition-opacity"
            :class="eventColorClass(event.category)"
          >
            <span class="material-symbols-outlined text-[10px]">{{ event.icon }}</span>
            {{ event.title }}
          </div>
        </div>
      </div>
    </TangoCard>

    <!-- ── WEEK VIEW ──────────────────────────────────────────────────── -->
    <TangoCard v-else-if="calendarView === 'week'" padding="none" shadow="default" class="w-full overflow-x-auto">
      <div class="grid grid-cols-7 min-w-[600px]">
        <!-- Day headers -->
        <div
          v-for="d in weekDays" :key="d.toISOString()"
          class="border-b-2 border-r border-on-surface last:border-r-0 p-2 text-center cursor-pointer hover:bg-surface-variant transition-colors"
          :class="isDateToday(d) ? 'bg-primary-container' : 'bg-surface'"
          @click="handleWeekDayClick(d)"
        >
          <div class="text-label-sm uppercase" :class="isDateToday(d) ? 'text-on-primary-container' : 'text-on-surface-variant'">
            {{ DAY_LABELS[d.getDay()] }}
          </div>
          <div class="text-headline-md font-bold" :class="isDateToday(d) ? 'text-on-primary-container' : 'text-on-surface'">
            {{ d.getDate() }}
          </div>
        </div>
        <!-- Event cells -->
        <div
          v-for="d in weekDays" :key="'ev-'+d.toISOString()"
          class="border-r border-surface-variant last:border-r-0 min-h-[200px] p-1 flex flex-col gap-1"
          :class="isDateToday(d) ? 'bg-primary-container/10' : 'bg-surface-container-lowest'"
          @click="openNewEventForDate(dateStr(d))"
        >
          <div
            v-for="event in getEventsForDate(d)" :key="event.id"
            @click.stop="openEventDetails(event)"
            class="text-[10px] px-1 py-0.5 pixel-border-sm truncate cursor-pointer hover:opacity-80 leading-tight"
            :class="eventColorClass(event.category)"
          >
            <span v-if="event.time !== 'All Day'" class="font-bold">{{ event.time }} </span>{{ event.title }}
          </div>
        </div>
      </div>
    </TangoCard>

    <!-- ── DAY VIEW ───────────────────────────────────────────────────── -->
    <TangoCard v-else padding="lg" shadow="default" class="w-full">
      <div class="flex justify-between items-center mb-6 border-b-2 border-on-background pb-4">
        <h3 class="text-headline-md text-on-surface">
          {{ currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) }}
        </h3>
        <TangoButton @click="openNewEventForDate(dateStr(currentDate))" variant="outline" size="sm">
          <span class="material-symbols-outlined text-[14px]">add</span> Add Event
        </TangoButton>
      </div>

      <div v-if="dayEvents.length === 0" class="text-body-md text-on-surface-variant py-8 text-center">
        Nothing scheduled. Add an event!
      </div>

      <div v-else class="space-y-3">
        <!-- All Day -->
        <div v-for="event in dayEvents.filter(e => e.time === 'All Day')" :key="event.id"
          @click="openEventDetails(event)"
          class="p-3 pixel-border-sm flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          :class="eventColorClass(event.category)"
        >
          <span class="material-symbols-outlined text-sm">{{ event.icon }}</span>
          <div>
            <div class="text-body-md font-bold">{{ event.title }}</div>
            <div class="text-label-sm uppercase opacity-70">All Day</div>
          </div>
        </div>
        <!-- Timed -->
        <div v-for="event in dayEvents.filter(e => e.time !== 'All Day')" :key="event.id"
          @click="openEventDetails(event)"
          class="p-3 pixel-border bg-surface flex items-center gap-3 cursor-pointer hover:bg-surface-variant transition-colors"
        >
          <div class="w-14 text-label-sm font-bold text-primary shrink-0 text-right">{{ event.time }}</div>
          <div class="w-0.5 h-8 bg-primary shrink-0"></div>
          <span class="material-symbols-outlined text-primary text-sm">{{ event.icon }}</span>
          <div>
            <div class="text-body-md font-bold">{{ event.title }}</div>
            <div class="text-label-sm text-outline uppercase">{{ event.category }}</div>
          </div>
        </div>
      </div>
    </TangoCard>

    <!-- ── BOTTOM BENTO ───────────────────────────────────────────────── -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 w-full">
      <TangoCard padding="lg" shadow="default" class="flex flex-col gap-4 w-full">
        <div class="flex items-center gap-4 border-b border-on-surface pb-4">
          <span class="material-symbols-outlined text-primary">notifications_active</span>
          <h3 class="text-headline-md text-on-surface">Coming Up</h3>
        </div>
        <ul class="space-y-4">
          <li v-if="upcomingEvents.length === 0" class="text-body-md text-on-surface-variant py-4">
            Nothing coming up. Add an event!
          </li>
          <li
            v-for="event in upcomingEvents" :key="event.id"
            @click="openEventDetails(event)"
            class="flex items-center gap-4 bg-surface p-4 pixel-border-sm cursor-pointer hover:bg-surface-variant transition-colors"
          >
            <div class="w-8 h-8 bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-sm pixel-border-sm">
              {{ event.date.split('-').pop() }}
            </div>
            <div>
              <p class="text-label-sm text-on-surface">{{ event.title }}</p>
              <p class="text-[12px] text-on-surface-variant">{{ event.time }}</p>
            </div>
          </li>
        </ul>
      </TangoCard>

      <TangoCard padding="lg" shadow="default" class="bg-secondary-container flex flex-col gap-4 justify-between relative overflow-hidden w-full">
        <div class="absolute inset-0 bg-dither opacity-30 z-0"></div>
        <div class="relative z-10">
          <h3 class="text-headline-md text-on-secondary-container mb-2">Sync Score</h3>
          <p class="text-body-md text-on-secondary-container">You and {{ store.partnerName }} have {{ syncScore }}% of events in sync.</p>
        </div>
        <div class="relative z-10 w-full bg-surface-container-lowest pixel-border h-6 mt-6">
          <div class="h-full bg-secondary border-r border-on-surface flex items-center" :style="{ width: syncScore + '%' }">
            <div class="w-full h-full" style="background-image: repeating-linear-gradient(45deg, #394b3d 25%, transparent 25%, transparent 75%, #394b3d 75%, #394b3d); background-position: 0 0, 4px 4px; background-size: 8px 8px;"></div>
          </div>
        </div>
      </TangoCard>
    </section>

    <NewEventSheet
      :show="showEventSheet"
      :initialDate="selectedDate"
      :initialEventId="selectedEventId"
      @close="showEventSheet = false; selectedEventId = null"
    />
  </div>
</template>
