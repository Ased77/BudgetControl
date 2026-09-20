import { CsrPriority } from '../types';
import { toPersianDigits } from './numberUtils';

/**
 * Generates standard basic CSV content for CSR Priorities
 */
export function generateBasicCsv(priorities: CsrPriority[]): string {
  const header = 'priority_id,title,default_percent,description';
  const rows = priorities.map((p) => {
    const escapedTitle = `"${(p.title || '').replace(/"/g, '""')}"`;
    const escapedDesc = `"${(p.description || '').replace(/"/g, '""')}"`;
    return `${p.code},${escapedTitle},${p.defaultPercentage},${escapedDesc}`;
  });
  return [header, ...rows].join('\n');
}

/**
 * Generates extended advanced CSV content for CSR Priorities
 */
export function generateExtendedCsv(priorities: CsrPriority[]): string {
  const header = 'priority_id,title,default_percent,description,weight_factor,is_active,min_percent,max_percent';
  const rows = priorities.map((p) => {
    const escapedTitle = `"${(p.title || '').replace(/"/g, '""')}"`;
    const escapedDesc = `"${(p.description || '').replace(/"/g, '""')}"`;
    const weight = p.weightFactor ?? 1.0;
    const isActive = p.isActive ? 'True' : 'False';
    const minP = p.minPercent ?? 0;
    const maxP = p.maxPercent ?? 100;
    return `${p.code},${escapedTitle},${p.defaultPercentage},${escapedDesc},${weight},${isActive},${minP},${maxP}`;
  });
  return [header, ...rows].join('\n');
}

/**
 * Triggers browser file download for generated CSV strings
 */
export function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parses CSV text content into CsrPriority objects
 */
export function parseCsvPriorities(csvText: string, existingPriorities: CsrPriority[]): CsrPriority[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headerParts = parseCsvLine(lines[0].toLowerCase());

  const codeIdx = headerParts.indexOf('priority_id');
  const titleIdx = headerParts.indexOf('title');
  const defPctIdx = headerParts.indexOf('default_percent');
  const descIdx = headerParts.indexOf('description');
  const weightIdx = headerParts.indexOf('weight_factor');
  const activeIdx = headerParts.indexOf('is_active');
  const minIdx = headerParts.indexOf('min_percent');
  const maxIdx = headerParts.indexOf('max_percent');

  const parsedList: CsrPriority[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (!cols || cols.length === 0) continue;

    const code = codeIdx !== -1 && cols[codeIdx] ? parseInt(cols[codeIdx], 10) : i;
    const title = titleIdx !== -1 && cols[titleIdx] ? cols[titleIdx].trim() : `اولویت ${toPersianDigits(i)}`;
    const defaultPercentage = defPctIdx !== -1 && cols[defPctIdx] ? parseFloat(cols[defPctIdx]) || 0 : 10;
    const description = descIdx !== -1 && cols[descIdx] ? cols[descIdx].trim() : '';

    const weightFactor = weightIdx !== -1 && cols[weightIdx] ? parseFloat(cols[weightIdx]) || 1.0 : 1.0;
    const isActive = activeIdx !== -1 && cols[activeIdx]
      ? cols[activeIdx].trim().toLowerCase() === 'true' || cols[activeIdx].trim() === '1'
      : true;
    const minPercent = minIdx !== -1 && cols[minIdx] ? parseFloat(cols[minIdx]) || 0 : 0;
    const maxPercent = maxIdx !== -1 && cols[maxIdx] ? parseFloat(cols[maxIdx]) || 100 : 100;

    // Find matching existing priority for icon and category
    const existing = existingPriorities.find((e) => e.code === code || e.title === title);

    parsedList.push({
      id: existing ? existing.id : `csv-p-${Date.now()}-${i}`,
      code: isNaN(code) ? i : code,
      title,
      description: description || existing?.description || '',
      category: existing ? existing.category : 'عمومی و محلی',
      defaultPercentage,
      currentPercentage: defaultPercentage,
      isActive,
      relatedIndicators: existing ? existing.relatedIndicators : ['povertyRate'],
      iconName: existing ? existing.iconName : 'Building',
      weightFactor,
      minPercent,
      maxPercent,
      subItems: existing?.subItems || [],
    });
  }

  return parsedList;
}

/**
 * Robust line parser handling quotes and commas
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}
