import * as XLSX from 'xlsx';

import { GearItem } from '@/store/useGearStore';

export const IMPORT_TEMPLATE_HEADERS = [
  'Brand',
  'Item Name',
  'Category',
  'Weight (lb)',
  'Quantity',
  'Notes',
  'Expiration (YYYY-MM-DD)',
];

export function generateTemplateCsv(): string {
  const rows = [
    IMPORT_TEMPLATE_HEADERS,
    ['KUIU', 'Super Down Pro Jacket', 'Clothing', '0.9', '1', 'Check zipper before season', ''],
  ];
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
}

function csvEscape(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Small hand-written CSV parser -- handles quoted fields (with embedded
// commas/newlines) and doubled-quote escaping, which is as much of the CSV
// spec as a gear-import template actually needs. Not meant to be a general
// RFC 4180 parser.
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// Parses a workbook (first sheet only) into the same string[][] shape as
// parseCsvText, via SheetJS. Cells come back already stringified.
export function parseWorkbookRows(data: ArrayBuffer): string[][] {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
  return rows
    .map((r) => r.map((cell) => String(cell ?? '').trim()))
    .filter((r) => r.some((cell) => cell !== ''));
}

const HEADER_ALIASES: Record<string, string[]> = {
  brand: ['brand'],
  name: ['itemname', 'item', 'name'],
  category: ['category'],
  weightLb: ['weightlb', 'weight'],
  quantity: ['quantity', 'qty', 'ownedqty'],
  notes: ['notes', 'note'],
  expiration: ['expirationyyyymmdd', 'expiration', 'expirationdate'],
};

const normalizeHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function buildColumnIndex(headerRow: string[]): Partial<Record<keyof typeof HEADER_ALIASES, number>> {
  const normalized = headerRow.map(normalizeHeader);
  const index: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  for (const key of Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]) {
    const aliases = HEADER_ALIASES[key];
    const col = normalized.findIndex((h) => aliases.includes(h));
    if (col !== -1) index[key] = col;
  }
  return index;
}

export type ImportSkip = { row: number; reason: string };

export type ImportResult = {
  valid: Omit<GearItem, 'id'>[];
  skipped: ImportSkip[];
  newCategories: string[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Rows must clear the same bar as the manual "Add gear" form (weight > 0,
// quantity >= 1) so an import can't silently create the zero-weight/qty
// junk entries the form itself refuses to save.
export function mapRowsToGearItems(rows: string[][], knownCategories: string[]): ImportResult {
  const valid: Omit<GearItem, 'id'>[] = [];
  const skipped: ImportSkip[] = [];
  const newCategorySet = new Set<string>();
  if (rows.length === 0) return { valid, skipped, newCategories: [] };

  const columns = buildColumnIndex(rows[0]);
  const dataRows = rows.slice(1);
  const cell = (row: string[], key: keyof typeof HEADER_ALIASES) => {
    const idx = columns[key];
    return idx == null ? '' : (row[idx] ?? '').trim();
  };

  dataRows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for header, +1 for 1-indexed display
    const name = cell(row, 'name');
    if (!name) {
      skipped.push({ row: rowNumber, reason: 'missing item name' });
      return;
    }
    const weightLb = Number(cell(row, 'weightLb'));
    if (!(weightLb > 0)) {
      skipped.push({ row: rowNumber, reason: 'missing or invalid weight' });
      return;
    }
    const quantityRaw = cell(row, 'quantity');
    const quantity = quantityRaw ? Math.round(Number(quantityRaw)) : 1;
    if (!(quantity >= 1)) {
      skipped.push({ row: rowNumber, reason: 'invalid quantity' });
      return;
    }

    const categoryRaw = cell(row, 'category') || 'Other';
    const known = knownCategories.find((c) => c.toLowerCase() === categoryRaw.toLowerCase());
    const category = known ?? categoryRaw;
    if (!known) newCategorySet.add(category);

    const expirationRaw = cell(row, 'expiration');
    const expiration = DATE_RE.test(expirationRaw) ? expirationRaw : undefined;

    valid.push({
      brand: cell(row, 'brand'),
      name,
      category,
      weightLb,
      quantity,
      notes: cell(row, 'notes') || undefined,
      expiration,
    });
  });

  return { valid, skipped, newCategories: [...newCategorySet] };
}
