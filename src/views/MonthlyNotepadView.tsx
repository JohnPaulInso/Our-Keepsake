// (2026-07-13) Refactor Monthly Notepad to Google Keep style textarea; was card
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CoupleProfile, KeepsakeMemory } from '../types';
import { DB } from '../db/localDb';

interface MonthlyNotepadViewProps {
  profile: CoupleProfile;
  memories: KeepsakeMemory[];
  initialYear?: number;
  initialMonth?: number;
  onBackToTimeline: () => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
  // (2026-07-13) Live sync notepad date edits into keepsake memories; was none
  onUpdateMemoriesLive?: (entries: { dateISO: string; story: string }[]) => void;
}

// (2026-07-13) Increase date entry char limit to 5000; was 3000
const DATE_CHAR_LIMIT = 5000;

// (2026-07-13) Parse date entries like 'Nov 16, 2026 - content' vs raw plain text
export function parseDateEntriesFromNotepad(
  text: string,
  fallbackYear: number,
  fallbackMonth: number
): { dateISO: string; story: string }[] {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const results: { dateISO: string; story: string }[] = [];

  const MONTH_MAP: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  for (const block of blocks) {
    const match = block.match(
      /^(?:([A-Za-z]+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\s*[-:—]\s*([\s\S]*)$/
    );
    if (match) {
      const monthStr = match[1]?.toLowerCase();
      const day = parseInt(match[2], 10);
      const parsedYear = match[3] ? parseInt(match[3], 10) : fallbackYear;
      const parsedMonth =
        monthStr && MONTH_MAP[monthStr] ? MONTH_MAP[monthStr] : fallbackMonth + 1;
      const story = match[4].trim();

      if (day >= 1 && day <= 31 && parsedMonth >= 1 && parsedMonth <= 12) {
        const dateISO = `${parsedYear}-${String(parsedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        results.push({ dateISO, story });
      }
    }
  }

  return results;
}

export const MonthlyNotepadView: React.FC<MonthlyNotepadViewProps> = ({
  profile,
  memories,
  initialYear,
  initialMonth,
  onBackToTimeline,
  onToast,
  onUpdateMemoriesLive,
}) => {
  const [year, setYear] = useState<number>(() => initialYear ?? new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => initialMonth ?? new Date().getMonth());
  const [notepadText, setNotepadText] = useState('');
  const [isSlideAnimating, setIsSlideAnimating] = useState<'left' | 'right' | null>(null);

  // Swipe gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const monthKey = useMemo(() => {
    const mStr = String(month + 1).padStart(2, '0');
    return `${year}-${mStr}`;
  }, [year, month]);

  const monthLabel = useMemo(() => {
    const d = new Date(year, month, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [year, month]);

  // Generate formatted notes from memories for this month
  const autoCompiledNotes = useMemo(() => {
    const monthMemories = memories
      .filter((m) => m.dateISO.startsWith(monthKey))
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    if (!monthMemories.length) return '';

    return monthMemories
      .map((m) => {
        const [y, mm, dd] = m.dateISO.split('-').map(Number);
        const dateObj = new Date(y, mm - 1, dd);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const content = m.storyBody || m.snippet || m.title || 'Quiet memories written for Zea.';
        return `${formattedDate} - ${content}`;
      })
      .join('\n\n');
  }, [memories, monthKey]);

  // (2026-07-13) Only load note when monthKey changes; was autoCompiledNotes
  useEffect(() => {
    const saved = DB.getMonthlyNotepad(monthKey);
    if (saved !== null) {
      setNotepadText(saved);
    } else if (autoCompiledNotes) {
      setNotepadText(autoCompiledNotes);
    } else {
      if (monthKey === '2026-11') {
        const sampleNov = `nov 15 - after mass service niadto tag goldilocks,palitan ninyog polvoron si ella nya ato gikuha sa dakit nya didto tag prince nag tuslob buwa hahahah buak kaayo saba kaayo ta nya busog kaayo nya imo ko gipalitag mangofloat na ice candy na tag 20 yeyy, nya busog tas bbq ug tuslobuwa nya nangadto tag city hall para mag uno, nya nag vid ta atong kaon na challenge mudagan nya amo gipanghurot ni kim ang jco ni ella nya nagprince ta palit tubig ug pringles nya nagpantalan ta nya nag practice tag pastorella wow kayg mga voices sge ta kayabag pero lingaw kaayong mga vms nato nya nagduwa ta ninyog guess the word katong contact contact, lisud kayg word sila saysay, cement ug contractor, like wtf nag panday2 pakog volcano2 pero nabawsan silas germinate wahahhaa, nya hatud natos ella nya talks about fr nelson and recent breakup ni ella, then bye bye naa\n\nnov 16 - fetched u at db and ngaon ta burger, chika padung uli nya chuy kaayo nakabagat tag truck nibuto ang ligid niaso jd ang dan adtos medellin, nya success sd nakuha ang motor ni dan nga naimpound, nya didto tag novo ug jnl murag kog bata nihigda kos jnl nya nagduwa atong blackpink na martilyo wahahhaha nya uli ta gibagat ta nila skyler totsy ug shadow arfarf nya nangluod ka nako pag uli`;
        setNotepadText(sampleNov);
      } else {
        setNotepadText('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  // Auto-grow textarea with unlimited spacing downward
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(480, textareaRef.current.scrollHeight + 32)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [notepadText, monthKey]);

  // (2026-07-13) Debounced live-sync of edited date entries to memory ledger; was none
  const syncTimerRef = useRef<number | null>(null);

  const triggerLiveSync = (text: string) => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(() => {
      if (onUpdateMemoriesLive) {
        const entries = parseDateEntriesFromNotepad(text, year, month);
        if (entries.length > 0) {
          onUpdateMemoriesLive(entries);
        }
      }
    }, 600);
  };

  const handleBlur = () => {
    if (onUpdateMemoriesLive) {
      const entries = parseDateEntriesFromNotepad(notepadText, year, month);
      if (entries.length > 0) {
        onUpdateMemoriesLive(entries);
      }
    }
  };

  // Enforce 3000 chars limit per date entry
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    const blocks = raw.split(/\n\s*\n/);
    let exceeded = false;
    const validated = blocks.map((block) => {
      if (block.length > DATE_CHAR_LIMIT) {
        exceeded = true;
        return block.slice(0, DATE_CHAR_LIMIT);
      }
      return block;
    });

    const finalVal = exceeded ? validated.join('\n\n') : raw;
    if (exceeded) {
      onToast('Limit reached: 5,000 characters per date entry', 'warning');
    }
    setNotepadText(finalVal);
    DB.setMonthlyNotepad(monthKey, finalVal);
    triggerLiveSync(finalVal);
  };

  const maxDateBlockLength = useMemo(() => {
    if (!notepadText.trim()) return 0;
    const blocks = notepadText.split(/\n\s*\n/).filter(Boolean);
    return Math.max(...blocks.map((b) => b.length), 0);
  }, [notepadText]);

  const handlePrevMonth = () => {
    setIsSlideAnimating('right');
    setTimeout(() => {
      if (month === 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else {
        setMonth((m) => m - 1);
      }
      setIsSlideAnimating(null);
    }, 180);
  };

  const handleNextMonth = () => {
    setIsSlideAnimating('left');
    setTimeout(() => {
      if (month === 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else {
        setMonth((m) => m + 1);
      }
      setIsSlideAnimating(null);
    }, 180);
  };

  // (2026-07-13) Exclude textarea from swipe navigation; was all touches
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.closest('textarea')) {
      return;
    }
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setTouchStartY(e.touches[0].clientY);
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    // Trigger swipe when predominantly horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      setSwipeDeltaX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (swipeDeltaX < -60) {
      handleNextMonth();
    } else if (swipeDeltaX > 60) {
      handlePrevMonth();
    }
    setSwipeDeltaX(0);
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleCopyAll = () => {
    if (!notepadText.trim()) {
      onToast('Notepad is empty for this month', 'info');
      return;
    }
    navigator.clipboard
      .writeText(notepadText)
      .then(() => onToast(`Copied ${monthLabel} notepad to clipboard!`, 'success'))
      .catch(() => onToast('Failed to copy', 'danger'));
  };

  const handleQuickAddDate = () => {
    const today = new Date();
    const formatted = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const prefix = notepadText.trim() ? `${notepadText.trim()}\n\n` : '';
    const newText = `${prefix}${formatted} - `;
    setNotepadText(newText);
    DB.setMonthlyNotepad(monthKey, newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 80);
  };

  const handleSyncFromKeepsakes = () => {
    if (!autoCompiledNotes) {
      onToast(`No date keepsakes recorded for ${monthLabel} yet`, 'info');
      return;
    }
    const merged = notepadText.trim()
      ? `${notepadText.trim()}\n\n${autoCompiledNotes}`
      : autoCompiledNotes;
    setNotepadText(merged);
    DB.setMonthlyNotepad(monthKey, merged);
    onToast(`Keepsake dates synced for ${monthLabel}!`, 'success');
  };

  return (
    <div
      id="monthly-notepad-container"
      className="flex flex-col w-full max-w-[820px] mx-auto select-text min-h-screen bg-transparent"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Google Keep-style Minimal Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-outline-variant/25 bg-surface-bright/90 backdrop-blur-sm sticky top-0 z-30 no-print">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToTimeline}
            aria-label="Return to timeline"
            className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous month"
              className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="font-sans font-semibold text-sm sm:text-base text-primary tracking-tight px-1">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next month"
              className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-secondary font-sans">
          <span className="hidden sm:inline text-[11px] text-outline">
            {maxDateBlockLength > 0 ? `${maxDateBlockLength} / ${DATE_CHAR_LIMIT} chars` : 'Max 5,000 chars/date'}
          </span>
          <button
            type="button"
            onClick={handleQuickAddDate}
            className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-medium text-xs flex items-center gap-1 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>+ Date</span>
          </button>
          <button
            type="button"
            onClick={handleCopyAll}
            title="Copy entire note"
            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-secondary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
          </button>
          <button
            type="button"
            onClick={handleSyncFromKeepsakes}
            title="Sync dates from timeline memories"
            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-secondary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
          </button>
        </div>
      </div>

      {/* Swipe Navigation Transition Canvas */}
      <div
        style={{
          transform: isSwiping && swipeDeltaX !== 0 ? `translateX(${swipeDeltaX * 0.5}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`w-full flex-1 flex flex-col bg-surface-bright transition-all ${
          isSlideAnimating === 'left'
            ? '-translate-x-8 opacity-40'
            : isSlideAnimating === 'right'
            ? 'translate-x-8 opacity-40'
            : 'translate-x-0 opacity-100'
        }`}
      >
        {/* Clean Google Keep Seamless Textarea without Outer Padding */}
        <div className="w-full flex-1 px-3 sm:px-6 pt-3 pb-32 md:pb-24">
          <textarea
            ref={textareaRef}
            value={notepadText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            // (2026-07-13) Remove notepad placeholder; was nov 15/16 sample text
            rows={20}
            className="w-full bg-transparent font-sans text-[13.5px] sm:text-[14px] leading-relaxed text-[#202124] dark:text-on-surface focus:outline-none resize-none border-0 p-0 m-0 placeholder:text-outline/40 select-text overflow-hidden"
            style={{ minHeight: '65vh' }}
          />
        </div>

        {/* Minimal Google Keep Bottom Status Bar */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 max-w-[820px] mx-auto px-4 py-2 bg-surface-bright/95 backdrop-blur-md border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-secondary font-sans z-20 no-print">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">cloud_done</span>
            <span>Saved to Vault</span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="hidden sm:inline">Limit 5,000 chars per date</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-secondary/70">
              {maxDateBlockLength > 0 ? `${maxDateBlockLength} / ${DATE_CHAR_LIMIT} chars` : '0 / 5,000 chars'}
            </span>
            <button
              type="button"
              onClick={onBackToTimeline}
              className="px-3 py-1 rounded-md bg-surface-container-high hover:bg-surface-variant text-primary font-medium text-xs active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
