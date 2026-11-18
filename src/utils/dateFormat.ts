// (2026-07-13) Enforce Jan 1, 2020 date format per SKILL.md vs raw dates
export function formatStandardDate(dateInput: string | number | Date | undefined): string {
  if (!dateInput) return 'Jan 1, 2026';
  try {
    let d: Date;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, day] = dateInput.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dateInput);
    }
    if (isNaN(d.getTime())) return 'Jan 1, 2026';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Jan 1, 2026';
  }
}

export function calculateDaysTogether(startDateISO: string): number {
  try {
    const [y, m, d] = startDateISO.split('-').map(Number);
    const start = new Date(y, m - 1, d).getTime();
    const now = Date.now();
    const diff = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
    return diff;
  } catch {
    return 428;
  }
}

export function calculateDaysUntil(targetDateISO: string): number {
  try {
    const [y, m, d] = targetDateISO.split('-').map(Number);
    const target = new Date(y, m - 1, d).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
    return diff;
  } catch {
    return 39;
  }
}

// (2026-07-13) Format current local date as YYYY-MM-DD; was hardcoded 2026-11-16
export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// (2026-07-13) Calculate chapter based on courting anniversary; was fixed II
export function getChapterNumber(dateISO?: string, courtingDateISO: string = '2025-11-07'): number {
  try {
    const [startYear, startMonth, startDay] = courtingDateISO.split('-').map(Number);
    let targetYear: number, targetMonth: number, targetDay: number;
    if (dateISO && /^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      [targetYear, targetMonth, targetDay] = dateISO.split('-').map(Number);
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
      targetDay = now.getDate();
    }

    let years = targetYear - startYear;
    if (
      targetMonth < startMonth ||
      (targetMonth === startMonth && targetDay < startDay)
    ) {
      years--;
    }
    return Math.max(1, years + 1);
  } catch {
    return 2;
  }
}

// (2026-07-13) Auto-capitalize text, lines, quotes & sentences; was raw text
export function capitalizeFirstLetters(text: string): string {
  if (!text) return '';
  return text
    .replace(/^(\s*["'“‘(]*)([a-z])/g, (_, s, c) => s + c.toUpperCase())
    .replace(/(\r?\n\s*[-*•"“‘(]*\s*)([a-z])/g, (_, s, c) => s + c.toUpperCase())
    .replace(/([.!?]["'”’)]*\s+["'“‘(]*)([a-z])/g, (_, s, c) => s + c.toUpperCase());
}

// (2026-07-13) Auto-detect ribbon dots by text keywords; was manual dots only
export function detectAutoDotIndicators(text: string, existingDots: Array<'GOLD' | 'MOCHA' | 'ROSE' | 'BURGUNDY'> = []): Array<'GOLD' | 'MOCHA' | 'ROSE' | 'BURGUNDY'> {
  const lower = (text || '').toLowerCase();
  const dots = new Set<'GOLD' | 'MOCHA' | 'ROSE' | 'BURGUNDY'>(existingDots);

  const dateKeywords = [
    'date', 'dates', 'lunch', 'dinner', 'cafe', 'plaza', 'ice cream',
    'empanada', 'eat', 'eating', 'laag', 'hangout', 'outing', 'kuyog', 'panta',
    'coffee', 'jollibee', 'mcdo', 'restaurant', 'food'
  ];
  const eventKeywords = [
    'concert', 'peryahan', 'market', 'nightmarket', 'games', 'rehearsal',
    'summit', 'party', 'trip', 'event', 'vacation', 'festival', 'pista',
    'mass', 'misa', 'serve', 'service', 'choir', 'meeting', 'funeral',
    'lubong', 'shrine', 'play', 'musical', 'theater', 'outing'
  ];
  const intimacyKeywords = [
    'finger', 'fingering', 'fingered', 'intimate', 'intimacy', 'fck', 'fucked',
    'fuck', 'makeout', 'kiss', 'kissed', 'chula', 'naked', 'hubo', 'hug',
    'hugs', 'huggiess', 'moan', 'moans', 'pussy', 'tilap', 'lulu', 'gakos',
    'kuot', 'chechay', 'liquid', 'sleeping together', 'sleepover', 'cum',
    'oral', 'condom', 'shower together', 'back hug'
  ];
  const milestoneKeywords = [
    'first time', '1st time', 'died', 'unboxed', 'leadership summit',
    'peckyy', 'milestone', 'anniversary', 'monthsary', 'core memory', 'first theater'
  ];

  if (dateKeywords.some(k => lower.includes(k))) dots.add('MOCHA');
  if (eventKeywords.some(k => lower.includes(k))) dots.add('GOLD');
  if (intimacyKeywords.some(k => lower.includes(k))) dots.add('ROSE');
  if (milestoneKeywords.some(k => lower.includes(k))) dots.add('BURGUNDY');

  if (dots.size === 0) dots.add('MOCHA');
  return Array.from(dots);
}

