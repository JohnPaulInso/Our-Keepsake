// (2026-07-13) Add Monthly Notepad view with swipe navigation; was none
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
}

export const MonthlyNotepadView: React.FC<MonthlyNotepadViewProps> = ({
  profile,
  memories,
  initialYear,
  initialMonth,
  onBackToTimeline,
  onToast,
}) => {
  const [year, setYear] = useState<number>(() => initialYear ?? new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => initialMonth ?? new Date().getMonth());
  const [isEditing, setIsEditing] = useState(false);
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

  // Load saved notepad or default to compiled notes
  useEffect(() => {
    const saved = DB.getMonthlyNotepad(monthKey);
    if (saved !== null) {
      setNotepadText(saved);
    } else if (autoCompiledNotes) {
      setNotepadText(autoCompiledNotes);
    } else {
      // Warm starter draft for November 2026 or empty
      if (monthKey === '2026-11') {
        const sampleNov = `Nov 15, 2026 - after mass service niadto tag goldilocks,palitan ninyog polvoron si ella nya ato gikuha sa dakit nya didto tag prince nag tuslob buwa hahahah buak kaayo saba kaayo ta nya busog kaayo nya imo ko gipalitag mangofloat na ice candy na tag 20 yeyy, nya busog tas bbq ug tuslobuwa nya nangadto tag city hall para mag uno, nya nag vid ta atong kaon na challenge mudagan nya amo gipanghurot ni kim ang jco ni ella nya nagprince ta palit tubig ug pringles nya nagpantalan ta nya nag practice tag pastorella wow kayg mga voices sge ta kayabag pero lingaw kaayong mga vms nato nya nagduwa ta ninyog guess the word katong contact contact, lisud kayg word sila saysay, cement ug contractor, like wtf nag panday2 pakog volcano2 pero nabawsan silas germinate wahahhaa, nya hatud natos ella nya talks about fr nelson and recent breakup ni ella, then bye bye naa\n\nNov 16, 2026 - fetched u at db and ngaon ta burger, chika padung uli nya chuy kaayo nakabagat tag truck nibuto ang ligid niaso jd ang dan adtos medellin, nya success sd nakuha ang motor ni dan nga naimpound, nya didto tag novo ug jnl murag kog bata nihigda kos jnl nya nagduwa atong blackpink na martilyo wahahhaha nya uli ta gibagat ta nila skyler totsy ug shadow arfarf nya nangluod ka nako pag uli`;
        setNotepadText(sampleNov);
      } else {
        setNotepadText('');
      }
    }
  }, [monthKey, autoCompiledNotes]);

  // Save changes to DB
  const handleSaveText = (text: string) => {
    setNotepadText(text);
    DB.setMonthlyNotepad(monthKey, text);
  };

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

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isEditing) return; // Don't swipe while typing in textarea
    if (e.touches.length === 1) {
      setTouchStartX(e.touches[0].clientX);
      setTouchStartY(e.touches[0].clientY);
      setIsSwiping(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isEditing || touchStartX === null || touchStartY === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    // Only engage if movement is mostly horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDeltaX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (isEditing) return;
    setIsSwiping(false);
    if (swipeDeltaX < -55) {
      // Swiped left -> next month
      handleNextMonth();
    } else if (swipeDeltaX > 55) {
      // Swiped right -> previous month
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

  const handleQuickAddToday = () => {
    const today = new Date();
    const formatted = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const prefix = notepadText.trim() ? `${notepadText.trim()}\n\n` : '';
    const newText = `${prefix}${formatted} - `;
    handleSaveText(newText);
    setIsEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 100);
  };

  const handleSyncFromKeepsakes = () => {
    if (!autoCompiledNotes) {
      onToast(`No date keepsakes recorded for ${monthLabel} yet`, 'info');
      return;
    }
    const merged = notepadText.trim()
      ? `${notepadText.trim()}\n\n${autoCompiledNotes}`
      : autoCompiledNotes;
    handleSaveText(merged);
    onToast(`Keepsake dates synced for ${monthLabel}!`, 'success');
  };

  // Parse lines for reading view
  const parsedEntries = useMemo(() => {
    if (!notepadText.trim()) return [];
    return notepadText
      .split(/\n\s*\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }, [notepadText]);

  return (
    <div
      id="monthly-notepad-container"
      className="flex flex-col w-full px-margin pb-space-xl max-w-[760px] mx-auto select-text"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header & Back to Timeline */}
      <div className="flex items-center justify-between py-space-sm mb-space-sm no-print">
        <button
          type="button"
          onClick={onBackToTimeline}
          aria-label="Return to timeline"
          className="flex items-center gap-space-xs text-secondary hover:text-primary transition-colors py-1 px-3 rounded-full bg-surface-container-low/90 active:scale-95 shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
            Timeline
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            title="Copy notepad text"
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-xs font-semibold uppercase tracking-wider transition-all shadow-xs ${
              isEditing
                ? 'bg-primary text-on-primary'
                : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">
              {isEditing ? 'visibility' : 'edit_note'}
            </span>
            <span>{isEditing ? 'Read Mode' : 'Edit Notepad'}</span>
          </button>
        </div>
      </div>

      {/* Month Navigation Strip with Left/Right Buttons */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="Previous month"
          className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-transform active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-secondary">
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            <span className="font-label-md text-[11px] font-bold uppercase tracking-widest text-secondary">
              Monthly Notepad • {profile.partner1Name} &amp; {profile.partner2Name}
            </span>
          </div>
          <h2 className="font-headline-sm text-lg sm:text-xl font-bold font-serif text-primary mt-0.5">
            {monthLabel}
          </h2>
          <span className="text-[11px] text-on-surface-variant font-medium mt-0.5">
            {parsedEntries.length} {parsedEntries.length === 1 ? 'day note' : 'day notes'} recorded
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="Next month"
          className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-transform active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      {/* Swipe Hint Pill */}
      <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-secondary/80 mb-3 no-print">
        <span className="material-symbols-outlined text-[14px]">swipe</span>
        <span>Swipe left or right to flip through months</span>
      </div>

      {/* Notepad Ruled Paper Card */}
      <div
        style={{
          transform: isSwiping && swipeDeltaX !== 0 ? `translateX(${swipeDeltaX * 0.7}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative bg-[#fcf9f2] rounded-2xl shadow-md border-2 border-[#dfcbb7] overflow-hidden transition-all ${
          isSlideAnimating === 'left'
            ? '-translate-x-12 opacity-40'
            : isSlideAnimating === 'right'
            ? 'translate-x-12 opacity-40'
            : 'translate-x-0 opacity-100'
        }`}
      >
        {/* Top Notepad Header Binding Accent */}
        <div className="h-4 bg-gradient-to-r from-secondary-container via-surface-container-high to-secondary-container/80 border-b border-[#dfcbb7]" />

        <div className="p-5 sm:p-7 min-h-[440px]">
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-secondary font-medium">
                <span>Type dates as &ldquo;Nov 15, 2026 - description&rdquo;</span>
                <span className="text-emerald-700 font-semibold">Auto-saved to Vault</span>
              </div>
              <textarea
                ref={textareaRef}
                value={notepadText}
                onChange={(e) => handleSaveText(e.target.value)}
                placeholder={`nov 15 - write down what happened with ${profile.partner2Name}...\n\nnov 16 - fetched her, went out for snacks, unforgettable conversations...`}
                rows={16}
                className="w-full bg-transparent font-serif text-[15px] sm:text-[16px] leading-8 text-on-surface focus:outline-none resize-y placeholder:text-outline/60 ruled-notebook"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4 font-serif text-[15px] sm:text-[16px] text-on-surface leading-relaxed">
              {parsedEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-on-surface-variant gap-3">
                  <span className="material-symbols-outlined text-[36px] text-secondary">
                    edit_note
                  </span>
                  <p className="font-serif text-lg text-primary">
                    No notes entered for {monthLabel} yet.
                  </p>
                  <p className="text-xs max-w-xs font-sans">
                    Tap &ldquo;Edit Notepad&rdquo; or &ldquo;+ Quick Add Date&rdquo; to start your
                    cozy daily notes for {profile.partner2Name}.
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickAddToday}
                    className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-sans text-xs uppercase tracking-wider font-semibold shadow-xs active:scale-95"
                  >
                    + Quick Add Date
                  </button>
                </div>
              ) : (
                parsedEntries.map((entry, idx) => {
                  // Format: Check for date header (e.g. "Nov 15, 2026 - " or "nov 15 -")
                  const dashIndex = entry.indexOf('-');
                  const hasDash = dashIndex > 0 && dashIndex < 24;
                  const datePart = hasDash ? entry.slice(0, dashIndex).trim() : null;
                  const descPart = hasDash ? entry.slice(dashIndex + 1).trim() : entry;

                  return (
                    <article
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-xl bg-surface-container-lowest/70 border border-[#ecdccb] shadow-xs relative"
                    >
                      {datePart && (
                        <div className="font-sans font-bold text-xs uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
                          <span>{datePart}</span>
                        </div>
                      )}
                      <p className="text-justify whitespace-pre-wrap leading-relaxed text-primary/95">
                        {descPart}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 bg-surface-container-low/70 border-t border-[#dfcbb7] flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickAddToday}
              className="px-3 py-1.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-primary font-sans text-xs font-semibold border border-outline-variant/30 flex items-center gap-1 shadow-2xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>+ Add Date Line</span>
            </button>
            <button
              type="button"
              onClick={handleSyncFromKeepsakes}
              title="Pull in sealed keepsake dates for this month"
              className="px-3 py-1.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-secondary font-sans text-xs font-semibold border border-outline-variant/30 flex items-center gap-1 shadow-2xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">sync</span>
              <span>Sync Dates</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
            <span className="material-symbols-outlined text-[14px]">save</span>
            <span>Saved in Our Keepsake</span>
          </div>
        </div>
      </div>
    </div>
  );
};
