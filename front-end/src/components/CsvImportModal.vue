<script setup lang="ts">
/**
 * CsvImportModal — F11 CSV Import
 *
 * Accepts a CSV file from the user's bank export, lets them map columns to
 * Tango's Transaction fields, shows a preview, and bulk-imports via
 * store.addTransaction(). Rows with parse errors are skipped and reported.
 */
import { ref, computed, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import { useAppStore } from '../stores/useStore';
import { iconForCategory } from '../utils/categoryIcons';
import { localDateISO } from '../utils/dateUtils';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);

const store = useAppStore();

// ── Step machine: upload → map → preview → done ────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'done';
const step = ref<Step>('upload');

// ── Raw CSV state ──────────────────────────────────────────────────────────

const headers = ref<string[]>([]);
const rows = ref<string[][]>([]);
const parseError = ref('');

// ── Column mapping ─────────────────────────────────────────────────────────

// Fields the user must (or can) map.
// "title" and "amount" are required; others are optional.
const FIELDS = [
  { key: 'title',    label: 'Title / Description', required: true  },
  { key: 'amount',   label: 'Amount',               required: true  },
  { key: 'date',     label: 'Date',                 required: false },
  { key: 'category', label: 'Category',             required: false },
  { key: 'note',     label: 'Note / Memo',          required: false },
  { key: 'type',     label: 'Type (expense/income)',required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

const mapping = ref<Record<FieldKey, string>>({
  title:    '',
  amount:   '',
  date:     '',
  category: '',
  note:     '',
  type:     '',
});

// Try to auto-detect common column names on first mount
function autoDetect() {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const find = (...candidates: string[]) =>
    headers.value.find(h => candidates.some(c => norm(h).includes(c))) ?? '';

  mapping.value = {
    title:    find('desc', 'narr', 'title', 'memo', 'note', 'merchant'),
    amount:   find('amount', 'amt', 'debit', 'credit', 'value'),
    date:     find('date', 'time', 'posted', 'transact'),
    category: find('categ', 'type', 'class'),
    note:     find('note', 'ref', 'memo', 'remark'),
    type:     find('type', 'credit', 'debit'),
  };
}

// ── Parsed preview rows ────────────────────────────────────────────────────

interface ParsedRow {
  title: string;
  amount: number;
  date: string;
  category: string;
  note: string;
  type: 'expense' | 'income';
  ok: boolean;
  error?: string;
}

// Use localDateISO so the fallback date is the local calendar day, not UTC. (B-UTC)
const todayISO = localDateISO();

function parseAmount(raw: string): number | null {
  // Strip currency symbols, spaces; handle parentheses as negative
  const cleaned = raw.replace(/[$,\s]/g, '').replace(/\(([^)]+)\)/, '-$1');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseDate(raw: string): string {
  if (!raw.trim()) return todayISO;
  // Try ISO first
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  // Try MM/DD/YYYY or DD/MM/YYYY or MM-DD-YYYY
  const parts = raw.trim().split(/[\/\-\.]/).map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    // If year-like in position 0 → YYYY-MM-DD
    if (a > 1900) return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
    // If year-like in position 2 → MM/DD/YYYY (US) or DD/MM/YYYY (EU); we default US
    if (c > 1900) return `${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
  }
  const d = new Date(raw);
  // Use localDateISO instead of toISOString().split('T')[0]: new Date(raw)
  // parses date-only strings as UTC midnight, so toISOString() returns the
  // UTC date which for UTC+ users during evening hours is yesterday. (B111)
  if (!isNaN(d.getTime())) return localDateISO(d);
  return todayISO;
}

function colVal(row: string[], colName: string): string {
  if (!colName) return '';
  const idx = headers.value.indexOf(colName);
  return idx >= 0 ? (row[idx] ?? '').trim() : '';
}

const parsedRows = computed<ParsedRow[]>(() => {
  return rows.value.map(row => {
    const rawTitle    = colVal(row, mapping.value.title);
    const rawAmount   = colVal(row, mapping.value.amount);
    const rawDate     = colVal(row, mapping.value.date);
    const rawCat      = colVal(row, mapping.value.category);
    const rawNote     = colVal(row, mapping.value.note);
    const rawType     = colVal(row, mapping.value.type);

    const title = rawTitle || '(no title)';
    const amount = parseAmount(rawAmount);
    const date = parseDate(rawDate);

    if (amount === null) {
      return { title, amount: 0, date, category: '', note: '', type: 'expense', ok: false, error: `Bad amount: "${rawAmount}"` };
    }

    // Determine type: negative = expense by convention; positive = income.
    // Also respect an explicit "type" column that contains debit/credit/expense/income.
    let txType: 'expense' | 'income';
    if (rawType) {
      const t = rawType.toLowerCase();
      txType = (t.includes('credit') || t.includes('income') || t.includes('deposit'))
        ? 'income' : 'expense';
    } else {
      txType = amount < 0 ? 'expense' : 'income';
    }

    const finalAmount = txType === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    const category = rawCat || (txType === 'income' ? 'Income' : 'General');

    return {
      title,
      amount: finalAmount,
      date,
      category,
      note: rawNote,
      type: txType,
      ok: true,
    };
  });
});

const validRows = computed(() => parsedRows.value.filter(r => r.ok));
const invalidRows = computed(() => parsedRows.value.filter(r => !r.ok));

// ── Import ─────────────────────────────────────────────────────────────────

const importing = ref(false);
const importedCount = ref(0);
const failedCount = ref(0);
const importError = ref('');

async function runImport() {
  importing.value = true;
  importedCount.value = 0;
  failedCount.value = 0;
  importError.value = '';
  // Process each valid row independently so a single failure (network blip,
  // validation error, etc.) does not abort the entire import.  Previously the
  // outer try/catch caught the first throw and left all subsequent rows unimported
  // with no indication of which rows had succeeded. (B82)
  try {
    for (const row of validRows.value) {
      try {
        await store.addTransaction({
          title: row.title,
          amount: row.amount,
          date: row.date,
          type: row.type,
          category: row.category,
          icon: iconForCategory(row.category, row.type),
          note: row.note || null,
        });
        importedCount.value++;
      } catch {
        failedCount.value++;
      }
    }
    step.value = 'done';
  } finally {
    importing.value = false;
  }
}

// ── File upload & CSV parsing ──────────────────────────────────────────────

const fileInput = ref<HTMLInputElement | null>(null);

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const hdrs = splitLine(nonEmpty[0]);
  const dataRows = nonEmpty.slice(1).map(splitLine).filter(r => r.some(c => c));
  return { headers: hdrs, rows: dataRows };
}

function onFileChosen(e: Event) {
  parseError.value = '';
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    parseError.value = 'Please choose a .csv file.';
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    parseError.value = 'File too large — max 5 MB.';
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target?.result as string;
    const parsed = parseCsv(text);
    if (!parsed.headers.length) {
      parseError.value = 'Could not parse CSV. Make sure the file has a header row.';
      return;
    }
    headers.value = parsed.headers;
    rows.value = parsed.rows;
    autoDetect();
    step.value = 'map';
  };
  reader.onerror = () => { parseError.value = 'Failed to read file.'; };
  reader.readAsText(file);
  input.value = '';
}

const mappingValid = computed(() =>
  FIELDS.filter(f => f.required).every(f => mapping.value[f.key])
);

// Reset state when modal closes
watch(() => step.value, (s) => {
  if (s === 'upload') {
    headers.value = [];
    rows.value = [];
    parseError.value = '';
    importing.value = false;
    importedCount.value = 0;
    failedCount.value = 0;
    importError.value = '';
  }
});

function reset() {
  step.value = 'upload';
  emit('close');
}
</script>

<template>
  <BaseModal :show="show" title="Import CSV Transactions" max-width="max-w-2xl" @close="reset">

    <!-- ── Step 1: Upload ──────────────────────────────────────────── -->
    <div v-if="step === 'upload'" class="flex flex-col gap-6">
      <p class="text-body-md text-on-surface-variant">
        Export a transaction CSV from your bank, then upload it here. The file must have a header row.
        Supported formats: most bank CSV exports (columns like <em>Date, Description, Amount</em>).
      </p>

      <div
        class="flex flex-col items-center justify-center gap-4 py-12 pixel-border-sm bg-surface-variant cursor-pointer hover:bg-primary-container transition-colors"
        @click="fileInput?.click()"
      >
        <span class="material-symbols-outlined text-4xl text-primary">upload_file</span>
        <p class="text-body-md font-bold uppercase">Click to choose a CSV file</p>
        <p class="text-label-sm text-on-surface-variant">Max 5 MB</p>
      </div>

      <input ref="fileInput" type="file" accept=".csv,text/csv" class="hidden" @change="onFileChosen" />

      <p v-if="parseError" class="text-label-sm text-error font-bold">{{ parseError }}</p>
    </div>

    <!-- ── Step 2: Column mapping ─────────────────────────────────── -->
    <div v-else-if="step === 'map'" class="flex flex-col gap-6">
      <p class="text-body-md text-on-surface-variant">
        {{ rows.length }} data rows found. Map your CSV columns to Tango's fields.
        Required fields are marked with *.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="field in FIELDS" :key="field.key" class="flex flex-col gap-1">
          <label class="text-label-sm uppercase font-bold text-on-surface-variant">
            {{ field.label }}{{ field.required ? ' *' : '' }}
          </label>
          <select
            v-model="mapping[field.key]"
            class="sunken-input px-3 py-2 text-body-md pixel-border-sm bg-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <option value="">— skip —</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
      </div>

      <!-- Quick preview of first 3 parsed rows -->
      <div v-if="parsedRows.length" class="overflow-x-auto">
        <p class="text-label-sm uppercase text-on-surface-variant font-bold mb-2">Preview (first 3 rows)</p>
        <table class="w-full text-label-sm pixel-border-sm">
          <thead>
            <tr class="bg-surface-variant">
              <th class="px-2 py-1 text-left">Title</th>
              <th class="px-2 py-1 text-right">Amount</th>
              <th class="px-2 py-1 text-left">Date</th>
              <th class="px-2 py-1 text-left">Category</th>
              <th class="px-2 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in parsedRows.slice(0, 3)" :key="i"
              :class="r.ok ? '' : 'bg-error-container text-on-error-container'">
              <td class="px-2 py-1 truncate max-w-[140px]">{{ r.title }}</td>
              <td class="px-2 py-1 text-right font-bold"
                :class="r.amount < 0 ? 'text-error' : 'text-secondary'">
                {{ r.amount < 0 ? '-' : '+' }}${{ Math.abs(r.amount).toFixed(2) }}
              </td>
              <td class="px-2 py-1">{{ r.date }}</td>
              <td class="px-2 py-1">{{ r.category }}</td>
              <td class="px-2 py-1">
                <span v-if="r.ok" class="text-secondary">✓ OK</span>
                <span v-else class="text-error">⚠ {{ r.error }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Step 3: Preview all ────────────────────────────────────── -->
    <div v-else-if="step === 'preview'" class="flex flex-col gap-4">
      <div class="flex gap-4 text-label-sm uppercase font-bold">
        <span class="text-secondary">{{ validRows.length }} valid</span>
        <span v-if="invalidRows.length" class="text-error">{{ invalidRows.length }} skipped</span>
      </div>

      <div class="max-h-72 overflow-y-auto custom-scrollbar">
        <table class="w-full text-label-sm pixel-border-sm">
          <thead class="sticky top-0 bg-surface-variant z-10">
            <tr>
              <th class="px-2 py-1 text-left">Title</th>
              <th class="px-2 py-1 text-right">Amount</th>
              <th class="px-2 py-1 text-left">Date</th>
              <th class="px-2 py-1 text-left">Category</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in validRows" :key="i" class="border-b border-surface-variant">
              <td class="px-2 py-1 truncate max-w-[160px]">{{ r.title }}</td>
              <td class="px-2 py-1 text-right font-bold"
                :class="r.amount < 0 ? 'text-error' : 'text-secondary'">
                {{ r.amount < 0 ? '-' : '+' }}${{ Math.abs(r.amount).toFixed(2) }}
              </td>
              <td class="px-2 py-1">{{ r.date }}</td>
              <td class="px-2 py-1">{{ r.category }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="invalidRows.length" class="bg-error-container text-on-error-container p-3 pixel-border-sm text-label-sm">
        <p class="font-bold mb-1">{{ invalidRows.length }} row(s) will be skipped:</p>
        <ul class="list-disc list-inside space-y-0.5">
          <li v-for="(r, i) in invalidRows.slice(0, 5)" :key="i">{{ r.title }} — {{ r.error }}</li>
          <li v-if="invalidRows.length > 5">…and {{ invalidRows.length - 5 }} more</li>
        </ul>
      </div>

      <p v-if="importError" class="text-error text-label-sm font-bold">{{ importError }}</p>
    </div>

    <!-- ── Step 4: Done ───────────────────────────────────────────── -->
    <div v-else-if="step === 'done'" class="flex flex-col items-center gap-6 py-8">
      <span class="material-symbols-outlined text-secondary text-6xl">check_circle</span>
      <p class="text-headline-md text-on-surface text-center">
        {{ importedCount }} transaction{{ importedCount !== 1 ? 's' : '' }} imported!
      </p>
      <p v-if="failedCount" class="text-body-md text-error text-center">
        {{ failedCount }} row{{ failedCount !== 1 ? 's' : '' }} failed to import and were skipped.
      </p>
      <p v-if="invalidRows.length" class="text-body-md text-on-surface-variant text-center">
        {{ invalidRows.length }} row{{ invalidRows.length !== 1 ? 's' : '' }} were skipped due to parse errors.
      </p>
    </div>

    <!-- ── Footer ──────────────────────────────────────────────────── -->
    <template #footer>
      <!-- Upload step -->
      <template v-if="step === 'upload'">
        <TangoButton @click="reset" variant="surface" size="sm">Cancel</TangoButton>
      </template>

      <!-- Map step -->
      <template v-else-if="step === 'map'">
        <TangoButton @click="step = 'upload'" variant="surface" size="sm">Back</TangoButton>
        <TangoButton
          @click="step = 'preview'"
          :disabled="!mappingValid"
          shadow="dark" size="sm"
        >Preview Import</TangoButton>
      </template>

      <!-- Preview step -->
      <template v-else-if="step === 'preview'">
        <TangoButton @click="step = 'map'" :disabled="importing" variant="surface" size="sm">Back</TangoButton>
        <TangoButton
          @click="runImport"
          :disabled="importing || validRows.length === 0"
          shadow="dark" size="sm"
        >{{ importing ? `Importing… ${importedCount}/${validRows.length}` : `Import ${validRows.length} rows` }}</TangoButton>
      </template>

      <!-- Done step -->
      <template v-else-if="step === 'done'">
        <TangoButton @click="reset" shadow="dark" size="sm">Done</TangoButton>
      </template>
    </template>
  </BaseModal>
</template>
