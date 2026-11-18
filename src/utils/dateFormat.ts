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
