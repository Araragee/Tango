<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAppStore, type CalendarEvent } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import NewEventSheet from './NewEventSheet.vue';
import DateNightPlanner from './DateNightPlanner.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import EmptyState from './EmptyState.vue';

const store = useAppStore();
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const showEventSheet = ref(false);
const showDatePlanner = ref(false);
const selectedDate = ref('');
const selectedEventId = ref<string | null>(null);
const calendarView = ref<'month' | 'week' | 'day'>('month');

const pendingDateReviews = computed(() => {
  return store.calendar.events.filter((e: CalendarEvent) =>
    e.category === 'date' && e.date < todayStr.value && (e.mood === null || e.mood === undefined)
  );
});

const reviewOldestPending = () => {
  const oldest = pendingDateReviews.value
    .slice()
    .sort((a: CalendarEvent, b: CalendarEvent) => a.date.localeCompare(b.date))[0];
  if (!oldest) return;
  selectedDate.value = oldest.date;
  selectedEventId.value = oldest.id;
  showEventSheet.value = true;
};

const currentDate = ref(new Date());

// todayStr must stay current — if the app is left open past midnight the
// static string becomes stale and "today" highlighting, pending-review filters,
// and upcoming-events cutoffs all point at the wrong day.
// Refresh by listening to visibilitychange so the value updates the moment the
// user returns to the tab on a new calendar day. (I15)
const _makeTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const todayStr = ref(_makeTodayStr());
const _onVisible = () => {
  if (document.visibilityState === 'visible') todayStr.value = _makeTodayStr();
};
onMounted(() => document.addEventListener('visibilitychange', _onVisible));
onUnmounted(() => document.removeEventListener('visibilitychange', _onVisible));

// ── Helpers ────────────────────────────────────────────────────────────────

const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Derive live from todayStr.value so the highlight is always correct even if
// the app is left open past midnight (todayStr updates on visibilitychange). (I15)
const isDateToday = (d: Date) =>
  dateStr(d) === todayStr.value;

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
    .filter((e: CalendarEvent) => e.date >= todayStr.value)
    .sort((a: CalendarEvent, b: CalendarEvent) => a.date.localeCompare(b.date))
    .slice(0, 3)
);

const syncScore = computed(() => {
  const total = store.calendar.events.length;
  if (total === 0) return 0;
  const shared = store.calendar.events.filter((e: CalendarEvent) => e.partners.length > 1).length;
  return Math.round((shared / total) * 100);
});

// ── ICS Export ─────────────────────────────────────────────────────────────

// RFC 5545 §3.1: content lines MUST NOT exceed 75 octets. Longer lines must
// be folded with CRLF + a single SPACE (or TAB) continuation character.
// Without folding, strict parsers (Thunderbird, some Outlook builds) reject
// or truncate lines. We fold on octets (UTF-8 bytes), not characters, so a
// multi-byte character is never split mid-sequence. (B122)
function foldICSLine(line: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(line)
  if (bytes.length <= 75) return line

  const decoder = new TextDecoder()
  const parts: string[] = []
  let offset = 0
  let first = true
  while (offset < bytes.length) {
    const limit = first ? 75 : 74 // continuation lines start with 1 space byte
    let end = Math.min(offset + limit, bytes.length)
    // Walk back if we split a multi-byte UTF-8 sequence (continuation bytes
    // are 0x80–0xBF). A leading byte of a sequence is either 0x00–0x7F (1b),
    // 0xC0–0xDF (2b), 0xE0–0xEF (3b), or 0xF0–0xF7 (4b).
    while (end < bytes.length && (bytes[end] & 0xC0) === 0x80) end--
    parts.push(decoder.decode(bytes.slice(offset, end)))
    offset = end
    first = false
  }
  return parts.join('\r\n ')
}

const exportICS = () => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tango//Shared Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  // RFC 5545 requires DTSTAMP on every VEVENT in a METHOD:PUBLISH calendar.
  // Without it some strict parsers reject the entire file. (B114)
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  for (const ev of store.calendar.events) {
    const dt = ev.date.replace(/-/g, '');
    const tm = ev.time && ev.time !== 'All Day' ? ev.time.replace(/:/g, '') + '00' : null;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@tango`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(tm ? `DTSTART:${dt}T${tm}` : `DTSTART;VALUE=DATE:${dt}`);
    // RFC 5545 requires DTEND (or DURATION) on every VEVENT. Without it many
    // calendar apps reject the event or display it with zero duration. For
    // all-day events DTEND is the next day (exclusive end); for timed events
    // default to 1-hour duration. (B113)
    if (tm) {
      // Add 1 hour to the start time for timed events
      const startMs = new Date(`${ev.date}T${ev.time}`).getTime();
      const endIso = new Date(startMs + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
      lines.push(`DTEND:${endIso}`);
    } else {
      // All-day: DTEND = next calendar day (exclusive)
      const next = new Date(ev.date + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      const nextDt = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
      lines.push(`DTEND;VALUE=DATE:${nextDt}`);
    }
    lines.push(foldICSLine(`SUMMARY:${ev.title.replace(/[,;\\]/g, (c) => '\\' + c)}`));
    if (ev.notes) lines.push(foldICSLine(`DESCRIPTION:${ev.notes.replace(/\n/g, '\\n').replace(/[,;\\]/g, (c) => '\\' + c)}`));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tango-calendar.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Upcoming deadline nudge (goals with deadline ≤ 7 days) ─────────────────
const upcomingGoalDeadlines = computed(() => {
  const now = todayStr.value;
  const d7 = new Date();
  d7.setDate(d7.getDate() + 7);
  const week = dateStr(d7);
  return store.plans.goals.filter((g: any) =>
    g.deadline && g.deadline >= now && g.deadline <= week && g.status !== 'Completed'
  ).sort((a: any, b: any) => (a.deadline ?? '').localeCompare(b.deadline ?? ''));
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
      <div class="flex flex-col gap-2 w-full md:w-auto md:items-end">
        <!-- Row 1: view switcher + period navigation -->
        <div class="flex items-center justify-between gap-2 w-full">
          <div class="flex pixel-border-sm overflow-hidden shrink-0">
            <button v-for="v in [['month', 'Month'], ['week', 'Week'], ['day', 'Day']] as const" :key="v[0]"
              @click="calendarView = v[0]"
              class="px-3 py-2 min-h-11 text-label-sm uppercase transition-colors"
              :class="calendarView === v[0] ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'">
              {{ v[1] }}
            </button>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <TangoButton @click="prevPeriod" variant="surface" size="md" aria-label="Previous period">
              <span class="material-symbols-outlined">chevron_left</span>
            </TangoButton>
            <TangoButton @click="goToday" variant="surface" size="md" aria-label="Go to today">Today</TangoButton>
            <TangoButton @click="nextPeriod" variant="surface" size="md" aria-label="Next period">
              <span class="material-symbols-outlined">chevron_right</span>
            </TangoButton>
          </div>
        </div>
        <!-- Row 2: actions — equal-width on mobile, inline on desktop -->
        <div class="grid grid-cols-3 gap-2 w-full sm:flex sm:w-auto">
          <TangoButton @click="exportICS" variant="surface" size="md" class="w-full sm:w-auto" aria-label="Export ICS">
            <span class="material-symbols-outlined text-[16px]">download</span>
            .ics
          </TangoButton>
          <TangoButton @click="showDatePlanner = true" variant="surface" size="md" class="w-full sm:w-auto" aria-label="Plan Date Night">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">favorite</span>
            <span class="truncate">Date Night</span>
          </TangoButton>
          <TangoButton @click="showEventSheet = true" variant="primary" size="md" class="w-full sm:w-auto" aria-label="New Event">
            <span class="material-symbols-outlined">add</span>
            <span class="truncate">New Event</span>
          </TangoButton>
        </div>
      </div>
    </section>

    <!-- Pending date review banner -->
    <div
      v-if="pendingDateReviews.length > 0"
      class="flex items-center justify-between gap-3 p-3 bg-primary-container pixel-border-sm"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="material-symbols-outlined text-on-primary-container" style="font-variation-settings: 'FILL' 1;">favorite</span>
        <div class="min-w-0">
          <p class="text-body-md font-bold text-on-primary-container truncate">
            {{ pendingDateReviews.length }} date{{ pendingDateReviews.length === 1 ? '' : 's' }} need a vibe rating
          </p>
          <p class="text-label-sm text-on-primary-container truncate">Tap to leave a quick mood + note</p>
        </div>
      </div>
      <TangoButton @click="reviewOldestPending" size="sm" shadow="dark">Review</TangoButton>
    </div>

    <!-- Goal deadline nudge banner -->
    <div
      v-if="upcomingGoalDeadlines.length > 0"
      class="flex items-center justify-between gap-3 p-3 bg-tertiary-container pixel-border-sm"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="material-symbols-outlined text-on-tertiary-container" style="font-variation-settings: 'FILL' 1;">flag</span>
        <div class="min-w-0">
          <p class="text-body-md font-bold text-on-tertiary-container truncate">
            {{ upcomingGoalDeadlines.length }} goal{{ upcomingGoalDeadlines.length === 1 ? '' : 's' }} deadline within 7 days
          </p>
          <p class="text-label-sm text-on-tertiary-container truncate">{{ upcomingGoalDeadlines.map((g: any) => g.title).join(', ') }}</p>
        </div>
      </div>
    </div>

    <!-- ── MONTH VIEW ─────────────────────────────────────────────────── -->
    <TangoCard v-if="calendarView === 'month'" padding="none" shadow="default" class="bg-surface-container-lowest p-1 w-full">
      <div class="grid grid-cols-7 gap-xs text-center border-b-2 border-on-surface pb-sm mb-sm bg-surface">
        <div v-for="day in DAY_LABELS" :key="day" class="text-label-sm text-on-surface uppercase">{{ day }}</div>
      </div>
      <div class="grid grid-cols-7 gap-[1px] bg-surface-variant">
        <div v-for="i in firstDayOffset" :key="'e'+i" class="bg-surface-container-low min-h-[60px] sm:min-h-[100px] p-xs"></div>
        <div
          v-for="day in daysInMonth" :key="day"
          class="min-h-[60px] sm:min-h-[100px] p-xs relative border border-transparent hover:border-primary-container transition-colors cursor-pointer"
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
          class="border-r border-surface-variant last:border-r-0 min-h-[120px] sm:min-h-[200px] p-1 flex flex-col gap-1"
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

      <div v-if="store.loading" class="space-y-3">
        <div v-for="n in 3" :key="n" class="p-3 pixel-border-sm flex items-center gap-3">
          <SkeletonBlock width="1.5rem" height="1.5rem" />
          <div class="flex-1 space-y-2">
            <SkeletonBlock height="0.875rem" width="50%" />
            <SkeletonBlock height="0.75rem" width="25%" />
          </div>
        </div>
      </div>
      <EmptyState
        v-else-if="dayEvents.length === 0"
        icon="event"
        title="Nothing scheduled"
        description="Add an event to this day."
      />

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
          <li v-if="upcomingEvents.length === 0">
            <EmptyState icon="calendar_month" title="Nothing coming up">
              <TangoButton class="mt-4" variant="secondary" @click="showEventSheet = true">Add Event</TangoButton>
            </EmptyState>
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

    <DateNightPlanner :show="showDatePlanner" @close="showDatePlanner = false" />

    <NewEventSheet
      :show="showEventSheet"
      :initialDate="selectedDate"
      :initialEventId="selectedEventId"
      @close="showEventSheet = false; selectedEventId = null"
    />
  </div>
</template>
