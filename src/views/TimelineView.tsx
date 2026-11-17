// (2026-07-13) Build interactive Timeline, Calendar & Search view per PRD
import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CoupleProfile,
  DigitalLoveLetter,
  DotIndicator,
  KeepsakeMemory,
  SecretYearNote,
} from '../types';
import { calculateDaysTogether, formatDuration, formatStandardDate } from '../utils/dateFormat';
import { audioEngine } from '../utils/audioEngine';
import { CustomDropdown } from '../components/CustomDropdown';

// (2026-07-13) Add digitalLoveLetters to TimelineViewProps vs secretNotes only
interface TimelineViewProps {
  profile: CoupleProfile;
  memories: KeepsakeMemory[];
  secretNotes: SecretYearNote[];
  digitalLoveLetters: DigitalLoveLetter[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenMemory: (id: string) => void;
  onEditMemory: (memory: KeepsakeMemory) => void;
  onReorderMemories: (reordered: KeepsakeMemory[]) => void;
  onOpenSecretNotesTab: () => void;
  onOpenProfileModal: () => void;
  // (2026-07-13) Add onOpenMonthlyNotepad callback prop; was missing prop
  onOpenMonthlyNotepad?: () => void;
}

interface SortableMemoryCardProps {
  memory: KeepsakeMemory;
  audioState: ReturnType<typeof audioEngine.getState>;
  onOpenMemory: (id: string) => void;
  onEditMemory: (memory: KeepsakeMemory) => void;
}

const SortableMemoryCard: React.FC<SortableMemoryCardProps> = ({
  memory,
  audioState,
  onOpenMemory,
  onEditMemory,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: memory.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.82 : 1,
    zIndex: isDragging ? 30 : 1,
  };

  const isPlayingThis =
    memory.audioMemo &&
    audioState.currentTrackId === memory.audioMemo.id &&
    audioState.isPlaying;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="relative bg-surface-container-lowest rounded-xl shadow-md p-space-md overflow-hidden transition-all duration-300 border border-outline-variant/25 hover-lift"
    >
      {/* Top Envelope Notch Accent & Location Tag */}
      <div className="flex items-center justify-between mb-space-sm gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
            location_on
          </span>
          <span className="font-label-md text-label-md uppercase tracking-widest text-secondary truncate-single">
            {memory.location || 'Our Secret Spot'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {memory.isDraft && (
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[10px] uppercase">
              Draft
            </span>
          )}
          <span className="font-body-sm text-body-sm text-on-surface-variant font-serif">
            {formatStandardDate(memory.dateISO)}
          </span>
          <button
            type="button"
            aria-label="Drag to reorder memory"
            {...attributes}
            {...listeners}
            className="p-1 text-outline hover:text-primary cursor-grab active:cursor-grabbing"
          >
            <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
          </button>
        </div>
      </div>

      {/* Memory Title */}
      <div
        onClick={() => onOpenMemory(memory.id)}
        className="cursor-pointer group"
      >
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-serif leading-snug mb-space-xs group-hover:text-secondary transition-colors">
          {memory.title || 'Untitled Memory'}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-space-md font-serif italic leading-relaxed clamp-3">
          “{memory.snippet || memory.storyBody}”
        </p>
      </div>

      {/* Media Visual Collage */}
      {memory.photos.length > 0 && memory.videoCapsule ? (
        <div
          onClick={() => onOpenMemory(memory.id)}
          className="grid grid-cols-2 gap-space-sm mb-space-md cursor-pointer"
        >
          <div className="relative h-40 rounded-lg overflow-hidden shadow-sm">
            <img
              className="w-full h-full object-cover"
              alt={memory.photos[0].caption || memory.title}
              src={memory.photos[0].url}
            />
            {memory.photos[0].tag && (
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-surface-bright/90 backdrop-blur-md text-primary font-label-md text-label-md shadow-xs">
                {memory.photos[0].tag}
              </div>
            )}
          </div>
          <div className="relative h-40 rounded-lg overflow-hidden shadow-sm">
            <img
              className="w-full h-full object-cover"
              alt={memory.videoCapsule.title}
              src={memory.videoCapsule.thumbnailUrl}
            />
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-surface-bright/90 text-primary flex items-center justify-center shadow-md">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </div>
            </div>
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-primary/80 backdrop-blur-md text-on-primary font-label-md text-label-md">
              Reel • {memory.videoCapsule.durationFormatted}
            </div>
          </div>
        </div>
      ) : memory.photos.length > 0 ? (
        <div
          onClick={() => onOpenMemory(memory.id)}
          className="relative w-full h-48 rounded-lg overflow-hidden mb-space-md shadow-sm cursor-pointer"
        >
          <img
            className="w-full h-full object-cover"
            alt={memory.photos[0].caption || memory.title}
            src={memory.photos[0].url}
          />
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-primary/80 backdrop-blur-md text-on-primary font-label-md text-label-md flex items-center gap-1 shadow-sm">
            <span className="material-symbols-outlined text-[14px]">photo_library</span>
            <span>
              {memory.photos.length} {memory.photos.length === 1 ? 'Photo' : 'Photos'}
            </span>
          </div>
        </div>
      ) : null}

      {/* (2026-07-13) Hide audio player if mock voice memo URL; was showing fake VM */}
      {memory.audioMemo && memory.audioMemo.url && !memory.audioMemo.url.startsWith('mock-') && (
        <div className="w-full bg-surface-container-low rounded-xl p-space-sm flex items-center gap-space-sm mb-space-md shadow-inner">
          <button
            type="button"
            onClick={() =>
              audioEngine.toggleTrack(
                memory.audioMemo!.id,
                memory.audioMemo!.durationSeconds,
                memory.audioMemo!.url,
                memory.audioMemo!.synthNotes
              )
            }
            className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm flex-shrink-0 active:scale-95 transition-transform"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPlayingThis ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between text-on-surface font-label-md text-label-md mb-1">
              <span className="truncate-single font-serif italic text-primary">
                “{memory.audioMemo.title}”
              </span>
              <span className="text-secondary ml-1 flex-shrink-0">
                {isPlayingThis
                  ? `${formatDuration(audioState.currentTime)} / ${memory.audioMemo.durationFormatted}`
                  : memory.audioMemo.durationFormatted}
              </span>
            </div>
            {/* Waveform Visualizer */}
            <div className="flex items-center gap-0.5 h-3 w-full">
              {memory.audioMemo.waveformPeaks.slice(0, 16).map((peak, idx) => {
                const progressRatio = isPlayingThis
                  ? audioState.currentTime / Math.max(1, audioState.duration)
                  : 0.32;
                const activeBar = idx / 16 <= progressRatio;
                return (
                  <span
                    key={idx}
                    style={{ height: `${Math.max(25, peak)}%` }}
                    className={`w-1 rounded-full transition-colors ${
                      activeBar ? 'bg-secondary' : 'bg-outline-variant'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vibe Tags Row */}
      {memory.vibeTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {memory.vibeTags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-full bg-surface-container-low text-secondary font-label-md text-[10px] tracking-wider uppercase border border-outline-variant/30"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Wax Seal Card Footer Interaction */}
      <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-xs shrink-0">
            <span
              className="material-symbols-outlined text-[15px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {memory.sealIcon || 'spa'}
            </span>
          </div>
          <span className="font-label-md text-label-md text-on-surface-variant font-serif truncate-single">
            {memory.sealLabel || 'Sealed in Chapter II'}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onEditMemory(memory)}
            className="text-secondary hover:text-primary font-label-md text-label-md flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenMemory(memory.id)}
            className="flex items-center gap-1 text-primary font-label-md text-label-md font-semibold hover:text-secondary transition-colors"
          >
            <span>Read Envelope</span>
            <span className="material-symbols-outlined text-[16px]">drafts</span>
          </button>
        </div>
      </div>

      {/* Faint Capybara Companion Lithograph Background Motif */}
      <div className="absolute -bottom-6 -right-6 pointer-events-none opacity-5 w-28 h-28 text-primary">
        <svg fill="currentColor" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45"></circle>
        </svg>
      </div>
    </article>
  );
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  profile,
  memories,
  secretNotes,
  digitalLoveLetters,
  searchQuery,
  onSearchChange,
  onOpenMemory,
  onEditMemory,
  onReorderMemories,
  onOpenSecretNotesTab,
  onOpenProfileModal,
  // (2026-07-13) Destructure onOpenMonthlyNotepad handler; was unpassed
  onOpenMonthlyNotepad,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'ALL' | 'PHOTO' | 'VOICE_MEMO' | 'VIDEO' | 'ANNIVERSARY' | 'DRAFT'
  >('ALL');
  const [dotFilter, setDotFilter] = useState<'ALL' | DotIndicator>('ALL');
  const [sortBy, setSortBy] = useState<'custom' | 'newest' | 'oldest'>('custom');
  // (2026-07-13) Default calendar to current month and date; was fixed Oct 2026
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  // (2026-07-13) Add fullscreen date state without navbars; was standard view only
  const [isFullscreenDateOpen, setIsFullscreenDateOpen] = useState<boolean>(false);
  const [audioState, setAudioState] = useState(audioEngine.getState());

  const selectedDayFormatted = useMemo(() => {
    if (selectedDay === null) return '';
    const d = new Date(calendarYear, calendarMonth, selectedDay);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [calendarYear, calendarMonth, selectedDay]);

  const selectedDayMemories = useMemo(() => {
    if (selectedDay === null) return [];
    const mStr = String(calendarMonth + 1).padStart(2, '0');
    const dStr = String(selectedDay).padStart(2, '0');
    const targetIso = `${calendarYear}-${mStr}-${dStr}`;
    return memories.filter((m) => m.dateISO === targetIso);
  }, [calendarYear, calendarMonth, selectedDay, memories]);

  const primaryDateMemory = selectedDayMemories[0] || null;

  useEffect(() => {
    return audioEngine.subscribe(() => {
      setAudioState(audioEngine.getState());
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const daysTogether = useMemo(
    () => calculateDaysTogether(profile.relationshipStartDateISO),
    [profile.relationshipStartDateISO]
  );

  // Build calendar days for calendarYear & calendarMonth
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    const cells: {
      day: number;
      inCurrentMonth: boolean;
      dateISO: string;
      dots: DotIndicator[];
    }[] = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push({ day: d, inCurrentMonth: false, dateISO: '', dots: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const iso = `${calendarYear}-${mStr}-${dStr}`;
      const matching = memories.filter((m) => m.dateISO === iso);
      const dotSet = new Set<DotIndicator>();
      matching.forEach((m) => m.dotIndicators.forEach((dot) => dotSet.add(dot)));
      cells.push({
        day: d,
        inCurrentMonth: true,
        dateISO: iso,
        dots: Array.from(dotSet),
      });
    }

    while (cells.length % 7 !== 0) {
      const nextDay = cells.length - (firstDayOfWeek + daysInMonth) + 1;
      cells.push({ day: nextDay, inCurrentMonth: false, dateISO: '', dots: [] });
    }

    return cells;
  }, [calendarYear, calendarMonth, memories]);

  const monthLabel = useMemo(() => {
    const d = new Date(calendarYear, calendarMonth, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarYear, calendarMonth]);

  // Week strip around selectedDay or 14th of month
  const weekStripDays = useMemo(() => {
    const anchor = selectedDay || 14;
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const start = Math.max(1, Math.min(daysInMonth - 6, anchor - 3));
    const list: {
      day: number;
      weekdayShort: string;
      dots: DotIndicator[];
    }[] = [];
    for (let d = start; d <= Math.min(daysInMonth, start + 6); d++) {
      const dateObj = new Date(calendarYear, calendarMonth, d);
      const weekdayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const iso = `${calendarYear}-${mStr}-${dStr}`;
      const matching = memories.filter((m) => m.dateISO === iso);
      const dotSet = new Set<DotIndicator>();
      matching.forEach((m) => m.dotIndicators.forEach((dot) => dotSet.add(dot)));
      list.push({ day: d, weekdayShort, dots: Array.from(dotSet) });
    }
    return list;
  }, [calendarYear, calendarMonth, selectedDay, memories]);

  const filteredMemories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return memories
      .filter((m) => {
        if (activeCategory === 'DRAFT') {
          if (!m.isDraft) return false;
        } else if (activeCategory !== 'ALL') {
          if (!m.categories.includes(activeCategory)) return false;
        }
        if (dotFilter !== 'ALL' && !m.dotIndicators.includes(dotFilter)) {
          return false;
        }
        if (selectedDay !== null) {
          const mStr = String(calendarMonth + 1).padStart(2, '0');
          const dStr = String(selectedDay).padStart(2, '0');
          const targetIso = `${calendarYear}-${mStr}-${dStr}`;
          if (m.dateISO !== targetIso) return false;
        }
        if (!q) return true;
        const haystack = [
          m.title,
          m.letterHeading,
          m.snippet,
          m.storyBody,
          m.quoteHighlight,
          m.location,
          m.moodVibe,
          ...m.vibeTags,
          ...m.photos.map((p) => p.caption),
          ...m.partnerNotes.map((n) => n.text),
          m.audioMemo?.title,
          formatStandardDate(m.dateISO),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.dateISO.localeCompare(a.dateISO);
        if (sortBy === 'oldest') return a.dateISO.localeCompare(b.dateISO);
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [
    memories,
    searchQuery,
    activeCategory,
    dotFilter,
    selectedDay,
    calendarMonth,
    calendarYear,
    sortBy,
  ]);

  const matchingSecretNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return secretNotes.filter((n) => {
      const hay = `${n.title} ${n.littleThingsNoted} ${n.whatSheSaid} ${n.secretThought} ${n.monthLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [secretNotes, searchQuery]);

  // (2026-07-13) Filter digitalLoveLetters in global search vs unsearched
  const matchingLoveLetters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return digitalLoveLetters.filter((l) => {
      const hay = `${l.title} ${l.occasion} ${l.salutation} ${l.body} ${l.signOff} ${l.paperNotes || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [digitalLoveLetters, searchQuery]);

  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = memories.findIndex((m) => m.id === active.id);
    const newIndex = memories.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(memories, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));
    onReorderMemories(reordered);
  };

  return (
    <div className="flex flex-col w-full px-margin pb-space-xl max-w-[760px] mx-auto">
      {/* Top Curated Editorial Invitation Header */}
      <section className="flex flex-col items-center text-center mt-space-sm mb-space-lg relative">
        <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high/80 text-secondary mb-space-sm shadow-sm">
          <span
            className="material-symbols-outlined text-[15px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          <span className="font-label-md text-label-md uppercase tracking-widest text-on-secondary-container">
            {profile.chapterTitle || 'Chapter II • Our Keepsake'}
          </span>
        </div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight font-serif mb-1">
          Together for {daysTogether} Days
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-[320px] italic font-serif">
          “{profile.heroQuote}”
        </p>

        {/* (2026-07-13) Boost Next Rendezvous card contrast & visibility; was faint */}
        <div
          id="next-rendezvous-card"
          onClick={onOpenProfileModal}
          className="mt-space-md w-full bg-[#fbf5ee] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-md relative overflow-hidden cursor-pointer border-2 border-[#dfcbb7] hover:border-primary/50 hover:shadow-lg transition-all active:scale-[0.99] group"
        >
          <div className="absolute -right-3 -bottom-3 opacity-10 text-primary pointer-events-none group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[64px]">wb_twilight</span>
          </div>

          <div className="flex items-center gap-3.5 min-w-0 z-10">
            <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">wb_twilight</span>
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="font-label-md text-[11px] font-bold text-secondary tracking-widest uppercase">
                Next Rendezvous • {profile.partner1Name} &amp; {profile.partner2Name}
              </span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold truncate-single font-serif mt-0.5">
                {profile.nextRendezvousTitle}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end flex-shrink-0 pl-3 z-10">
            <span className="px-3 py-1 rounded-full bg-primary text-on-primary font-label-md text-xs font-semibold shadow-xs">
              {profile.nextRendezvousDayLabel}
            </span>
            <span className="font-body-sm text-xs font-semibold text-secondary mt-1">
              {profile.nextRendezvousTimeLabel}
            </span>
          </div>
        </div>
      </section>

      {/* Instant Search & Filter Sanctuary Bar */}
      <section
        id="keepsake-search-section" // Search bar for memories & Zea's notes
        className="bg-surface-container-lowest rounded-xl p-space-md mb-space-lg shadow-sm border border-outline-variant/35 flex flex-col gap-space-sm"
      >
        <div className="relative flex items-center">
          <span className="material-symbols-outlined text-[20px] text-secondary absolute left-3.5 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${profile.partner2Name}'s memories, dates, places, quotes, or secret notes...`}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface-container-low text-primary placeholder:text-outline font-body-md text-body-md focus:outline-none border border-outline-variant/40 focus:border-primary"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-secondary hover:text-primary"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CustomDropdown
            options={[
              { value: 'custom', label: 'Sort: Curated Order', icon: 'reorder' },
              { value: 'newest', label: 'Sort: Newest Date', icon: 'arrow_downward' },
              { value: 'oldest', label: 'Sort: Oldest Date', icon: 'arrow_upward' },
            ]}
            value={sortBy}
            onChange={(val) => setSortBy(val as 'custom' | 'newest' | 'oldest')}
          />
          {/* (2026-07-13) Update dropdown dots to Events, Date, Milestone; was Media */}
          <CustomDropdown
            options={[
              { value: 'ALL', label: 'All Dot Colors', icon: 'palette' },
              { value: 'GOLD', label: 'Gold • Events', icon: 'event' },
              { value: 'MOCHA', label: 'Mocha • Date', icon: 'calendar_month' },
              { value: 'ROSE', label: 'Rose • Milestone', icon: 'stars' },
            ]}
            value={dotFilter}
            onChange={(val) => setDotFilter(val as 'ALL' | DotIndicator)}
          />
        </div>

        {(searchQuery || selectedDay !== null || dotFilter !== 'ALL' || activeCategory !== 'ALL') && (
          <div className="flex items-center justify-between pt-1 text-secondary font-label-md text-label-md">
            <span>
              Showing {filteredMemories.length}{' '}
              {filteredMemories.length === 1 ? 'memory' : 'memories'}
              {matchingSecretNotes.length > 0
                ? ` + ${matchingSecretNotes.length} secret year notes`
                : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setSelectedDay(null);
                setDotFilter('ALL');
                setActiveCategory('ALL');
              }}
              className="text-primary underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Matching Secret Past-Year Notes & Digital Love Letters when searching */}
      {(matchingSecretNotes.length > 0 || matchingLoveLetters.length > 0) && (
        <section className="mb-space-lg bg-secondary-container/35 rounded-xl p-space-md border border-outline-variant/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                auto_awesome
              </span>
              <span className="font-headline-sm text-headline-sm text-primary font-serif">
                Matches in Love Letters &amp; Secret Year Notes ({matchingLoveLetters.length + matchingSecretNotes.length})
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenSecretNotesTab}
              className="font-label-md text-label-md uppercase tracking-wider text-primary underline"
            >
              Open Letters Vault
            </button>
          </div>
          {matchingLoveLetters.map((letter) => (
            <div
              key={letter.id}
              onClick={onOpenSecretNotesTab}
              className="bg-surface-container-lowest rounded-lg p-3 shadow-xs cursor-pointer hover:bg-surface-bright transition-colors border-l-2 border-primary"
            >
              <div className="flex items-center justify-between text-secondary font-label-md text-[10px] uppercase tracking-wider mb-0.5">
                <span>Digital Love Letter #{letter.letterNumber} • {letter.occasion}</span>
                <span>{formatStandardDate(letter.dateISO)}</span>
              </div>
              <p className="font-headline-sm text-body-md text-primary font-serif">{letter.title}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant italic clamp-2">
                {letter.body}
              </p>
            </div>
          ))}
          {matchingSecretNotes.map((note) => (
            <div
              key={note.id}
              onClick={onOpenSecretNotesTab}
              className="bg-surface-container-lowest rounded-lg p-3 shadow-xs cursor-pointer hover:bg-surface-bright transition-colors"
            >
              <div className="flex items-center justify-between text-secondary font-label-md text-[10px] uppercase tracking-wider mb-0.5">
                <span>{note.monthLabel}</span>
                <span>{formatStandardDate(note.dateISO)}</span>
              </div>
              <p className="font-headline-sm text-body-md text-primary font-serif">{note.title}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant italic clamp-2">
                {note.littleThingsNoted}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* (2026-07-13) Improve calendar typography with Google Fonts vs oldstyle serif */}
      <section
        id="keepsake-monthly-calendar-card" // Monthly calendar card with Google Fonts
        className="relative bg-surface-container-lowest rounded-2xl shadow-md p-space-md mb-space-lg overflow-hidden border border-outline-variant/35"
      >
        <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/40 mb-space-sm">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[16px] text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
            <span className="calendar-header-font text-[22px] font-semibold text-primary tracking-tight">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container calendar-num-font text-[10px] font-semibold tracking-widest uppercase ml-0.5"
            >
              <span>{selectedDay ? 'Show All' : 'Keepsake'}</span>
            </button>
            {/* (2026-07-13) Add notepad quick button in calendar header; was missing */}
            {onOpenMonthlyNotepad && (
              <button
                type="button"
                onClick={onOpenMonthlyNotepad}
                title="Open Monthly Notepad"
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-container-low text-secondary hover:text-primary transition-colors active:scale-95 ml-1"
              >
                <span className="material-symbols-outlined text-[15px]">sticky_note_2</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next Month"
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>

        {/* 7-Column Day-of-Week Headers in Plus Jakarta Sans */}
        <div className="grid grid-cols-7 text-center calendar-num-font text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary py-1.5 mb-1">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Monthly Calendar Days Grid with crisp lining tabular Google Font numbers */}
        <div className="grid grid-cols-7 gap-y-1.5 text-center calendar-num-font text-[13.5px]">
          {calendarDays.map((cell, idx) => {
            if (!cell.inCurrentMonth) {
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center h-10 text-outline opacity-35 select-none font-normal"
                >
                  <span>{cell.day}</span>
                </div>
              );
            }
            const isSelected = selectedDay === cell.day;
            const hasDots = cell.dots.length > 0;
            return (
              <button
                key={idx}
                type="button"
                // (2026-07-13) Open date overlay on select; was setting filter only
                onClick={() => {
                  setSelectedDay(cell.day);
                  setIsFullscreenDateOpen(true);
                }}
                className={`flex flex-col items-center justify-center h-10 mx-auto w-10 rounded-xl transition-all relative ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold shadow-sm active:scale-95'
                    : hasDots
                      ? 'bg-secondary-container/35 text-primary font-semibold hover:bg-secondary-container/60'
                      : 'hover:bg-surface-container text-primary font-medium'
                }`}
              >
                <span className="leading-none">{cell.day}</span>
                {hasDots && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {cell.dots.includes('GOLD') && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: '#E5A93C' }}
                      />
                    )}
                    {cell.dots.includes('MOCHA') && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: '#5C4033' }}
                      />
                    )}
                    {cell.dots.includes('ROSE') && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: '#C96B78' }}
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* (2026-07-13) Update calendar legend to Events, Date, Milestone; was media */}
        <div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-outline-variant/30">
          <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-3 w-full pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E5A93C' }} />
              <span className="text-on-surface-variant calendar-legend-font text-[14px]">
                Events
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5C4033' }} />
              <span className="text-on-surface-variant calendar-legend-font text-[14px]">
                Date
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#C96B78' }} />
              <span className="text-on-surface-variant calendar-legend-font text-[14px]">
                Milestone
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-on-surface-variant calendar-legend-font text-[14px]">
                Selected
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Scrollable Week Strip */}
      <section className="flex flex-col mb-space-lg">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-primary font-serif">
              {monthLabel}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim" />
          </div>
          {/* (2026-07-13) Add Monthly Notepad button in timeline strip; was absent */}
          <div className="flex items-center gap-2">
            {onOpenMonthlyNotepad && (
              <button
                type="button"
                onClick={onOpenMonthlyNotepad}
                className="flex items-center gap-1 text-primary font-label-md text-label-md tracking-wider uppercase px-2.5 py-1 rounded-full bg-secondary-container/60 hover:bg-secondary-container transition-colors shadow-2xs active:scale-95"
                title="Open Monthly Notepad"
              >
                <span className="material-symbols-outlined text-[15px]">sticky_note_2</span>
                <span>Notepad</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                // (2026-07-13) Reset view to current month on clear; was fixed Oct 2026
                setCalendarYear(new Date().getFullYear());
                setCalendarMonth(new Date().getMonth());
                setSelectedDay(null);
              }}
              className="flex items-center gap-1 text-secondary font-label-md text-label-md tracking-wider uppercase hover:text-primary transition-colors"
            >
              <span>{selectedDay ? 'Clear Day Filter' : 'Full Journal'}</span>
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-space-sm overflow-x-auto py-1 no-scrollbar -mx-margin px-margin">
          {weekStripDays.map((item) => {
            const isSelected = selectedDay === item.day;
            return (
              <button
                key={item.day}
                type="button"
                // (2026-07-13) Open date overlay from week strip; was filter only
                onClick={() => {
                  setSelectedDay(item.day);
                  setIsFullscreenDateOpen(true);
                }}
                className={`flex flex-col items-center justify-center min-w-[52px] h-[74px] rounded-xl flex-shrink-0 relative transition-transform active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container-low text-on-surface-variant shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-1 right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-tertiary-fixed text-primary shadow-xs">
                    <span
                      className="material-symbols-outlined text-[9px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      pets
                    </span>
                  </div>
                )}
                <span
                  className={`font-label-md text-label-md uppercase ${
                    isSelected ? 'text-primary-fixed-dim' : 'text-secondary'
                  }`}
                >
                  {item.weekdayShort}
                </span>
                {/* (2026-07-13) Use Google Font tabular nums on week strip vs serif */}
                <span
                  className={`calendar-num-font text-[17px] mt-0.5 ${
                    isSelected ? 'font-bold text-surface-bright' : 'font-semibold text-primary'
                  }`}
                >
                  {item.day}
                </span>
                <div className="flex items-center gap-0.5 mt-1 h-1.5">
                  {item.dots.includes('GOLD') && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#E5A93C' }}
                    />
                  )}
                  {item.dots.includes('MOCHA') && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#5C4033' }}
                    />
                  )}
                  {item.dots.includes('ROSE') && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#C96B78' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tactile Botanical Filter Ribbon */}
      <section className="flex items-center gap-space-xs overflow-x-auto no-scrollbar -mx-margin px-margin mb-space-lg">
        {/* All Dates for entire journal */}
        <button
          type="button"
          onClick={() => {
            setSelectedDay(null);
            setActiveCategory('ALL');
          }}
          className={`px-space-md py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wider shadow-sm flex-shrink-0 flex items-center gap-1 transition-colors ${
            selectedDay === null && activeCategory === 'ALL'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
          }`}
        >
          <span>All Dates</span>
        </button>

        {/* Selected specific date pill */}
        {selectedDay !== null && (
          <button
            type="button"
            onClick={() => setActiveCategory('ALL')}
            className={`px-space-md py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wider shadow-sm flex-shrink-0 flex items-center gap-1.5 transition-colors ${
              activeCategory === 'ALL'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">event</span>
            <span>{selectedDayFormatted}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDay(null);
              }}
              title="Clear date"
              className="ml-0.5 hover:opacity-75"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </span>
          </button>
        )}

        {[
          { id: 'PHOTO', label: 'Photos', icon: 'photo_camera' },
          { id: 'VOICE_MEMO', label: 'Voice Memos', icon: 'mic' },
          { id: 'VIDEO', label: 'Videos', icon: 'movie' },
          { id: 'ANNIVERSARY', label: 'Milestones', icon: 'stars' },
          { id: 'DRAFT', label: 'Drafts', icon: 'edit_note' },
        ].map((tab) => {
          const active = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveCategory(
                  tab.id as 'PHOTO' | 'VOICE_MEMO' | 'VIDEO' | 'ANNIVERSARY' | 'DRAFT'
                )
              }
              className={`px-space-md py-1.5 rounded-full font-label-md text-label-md uppercase tracking-wider shadow-sm flex-shrink-0 flex items-center gap-1 transition-colors ${
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-variant'
              }`}
            >
              {tab.icon && (
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </section>

      {/* (2026-07-13) Open overlay directly on date select; was bottom card */}
      {filteredMemories.length === 0 ? (
        <div
          id="clean-slate-empty-card" // Clean slate stationery empty state card
          className="bg-surface-container-lowest rounded-2xl p-8 text-center shadow-sm border border-outline-variant/35 flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-secondary-container/50 text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">
              {memories.length === 0 ? 'auto_stories' : 'search_off'}
            </span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
            {memories.length === 0
              ? `Your Clean Slate for ${profile.partner1Name} & ${profile.partner2Name} is Ready`
              : 'No Keepsakes Match This Filter'}
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
            {memories.length === 0
              ? 'All previous showcase memories, love letters, and secret notes have been safely backed up to /backup so you can connect Firebase and begin with a fresh canvas.'
              : `Try clearing your search query or selecting "All Dates" to see every memory written for ${profile.partner2Name}.`}
          </p>
          {memories.length === 0 && (
            <a
              href="/backup"
              className="mt-1 px-4 py-2 rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider border border-outline-variant/40 hover:bg-secondary-container/40 transition-colors"
            >
              Open /backup Archive Vault
            </a>
          )}
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredMemories.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-space-lg">
                {filteredMemories.map((memory) => (
                  <SortableMemoryCard
                    key={memory.id}
                    memory={memory}
                    audioState={audioState}
                    onOpenMemory={onOpenMemory}
                    onEditMemory={onEditMemory}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* End of Feed Gentle Romantic Capybara Vignette */}
      <div className="mt-space-xl flex flex-col items-center justify-center text-center p-space-md">
        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-space-xs shadow-inner">
          <span className="material-symbols-outlined text-[24px]">favorite_border</span>
        </div>
        <span className="font-label-md text-label-md uppercase tracking-widest text-secondary mb-1">
          Until Next Memory
        </span>
        <p className="font-body-sm text-body-sm text-on-surface-variant italic font-serif max-w-[260px]">
          Every shared instant with {profile.partner2Name} is a page in the book we are writing
          together.
        </p>
      </div>

      {/* (2026-07-13) Add fullscreen date view matching chapter page without navbars */}
      {isFullscreenDateOpen && selectedDay !== null && (
        <div
          id="specific-date-fullscreen-view"
          className="fixed inset-0 z-[60] bg-background text-on-surface overflow-y-auto px-4 py-8 md:px-8 md:py-12 flex flex-col items-center select-text no-print"
        >
          {/* Subtle paper dot background texture */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#4a3b32_1px,transparent_1px)] [background-size:20px_20px] -z-10" />

          {/* Top discreet bar without navbars */}
          <div className="w-full max-w-xl flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => setIsFullscreenDateOpen(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high/90 text-primary border border-outline-variant/30 text-[13px] font-medium shadow-sm hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Timeline</span>
            </button>
            <span className="text-[11px] uppercase font-bold tracking-widest text-secondary bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/30">
              Fullscreen Chapter
            </span>
          </div>

          {/* Romantic Header from Screenshot */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-secondary-container/50 flex items-center justify-center text-primary shadow-inner">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 48 48">
                  <path d="M14 34c0-7 4-13 12-13 5 0 9 3 11 8 .5 1.5 1.5 3 3 3h1c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5h-5c-2 0-3 1-4 2" />
                  <path d="M14 26c-2 0-4-1.5-4-4 0-3 2-6 5-6h5c3 0 5 2 5 5v5" />
                  <circle cx="17" cy="20" fill="currentColor" r="1.2" />
                  <circle cx="39" cy="18" fill="#cca440" r="1.5" />
                </svg>
              </div>
              <span className="absolute -top-1 -right-2 text-tertiary-fixed-dim material-symbols-outlined text-[18px]">
                auto_awesome
              </span>
            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight font-serif text-2xl md:text-3xl">
              {primaryDateMemory ? primaryDateMemory.title || "Preserve Today's Chapter" : "Preserve Today's Chapter"}
            </h2>
            <p className="text-secondary mt-1 max-w-xs leading-relaxed font-serif italic text-sm">
              Every little moment with {profile.partner2Name} is worth remembering forever.
            </p>
          </div>

          {/* Context Pills: Date & Time and Location & Vibe matching screenshot */}
          <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low text-primary rounded-full shadow-sm border border-outline-variant/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-[20px] text-secondary">
                  calendar_today
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">
                    Date
                  </span>
                  <span className="text-sm font-medium text-primary truncate-single">
                    {selectedDayFormatted} • Whole Day Note
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low text-primary rounded-full shadow-sm border border-outline-variant/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-[20px] text-tertiary-container">
                  location_on
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">
                    Location
                  </span>
                  <span className="text-sm font-medium text-primary truncate-single">
                    {primaryDateMemory?.location || 'Bogo City, Cebu'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Editorial Title & Ruled Note Card matching screenshot */}
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl p-6 sm:p-7 shadow-md relative overflow-hidden flex flex-col border border-outline-variant/30 mb-8">
            {/* Watermark in corner */}
            <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.05] pointer-events-none text-primary">
              <svg fill="currentColor" viewBox="0 0 100 100">
                <path d="M20 70c0-18 12-32 30-32 15 0 26 8 30 20 2 4 4 8 8 8h4c4 0 6 3 6 7s-3 7-6 7h-12c-5 0-8 3-10 6H20z" />
                <circle cx="32" cy="48" r="4" />
                <circle cx="56" cy="24" r="8" />
              </svg>
            </div>

            {/* Title of this moment */}
            <div className="mb-5 pb-3 border-b border-surface-container-high">
              <span className="text-[10px] uppercase tracking-wider text-outline font-semibold block mb-1">
                Title of this moment
              </span>
              <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                {primaryDateMemory?.title || "Sunday morning pastries and warm coffee..."}
              </h3>
            </div>

            {/* The Heartfelt Note with stationery lines */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-outline font-semibold block mb-2">
                The Heartfelt Note
              </span>
              <div className="min-h-[160px] text-on-surface-variant font-serif text-base leading-[2rem] bg-[linear-gradient(transparent_31px,#e5ded8_32px)] bg-[size:100%_32px]">
                <p className="whitespace-pre-wrap">
                  {primaryDateMemory?.storyBody || primaryDateMemory?.snippet || "Write down how Zea smiled, what she said, the quiet moments you never want to forget..."}
                </p>
              </div>
            </div>

            {/* What Zea Said (Optional and placed at the bottom) */}
            {primaryDateMemory?.quoteHighlight && (
              <div className="mt-5 pt-3 border-t border-surface-container-high">
                <span className="text-[10px] uppercase tracking-wider text-outline font-semibold block mb-1">
                  What {profile.partner2Name} Said (Highlighted Quote)
                </span>
                <p className="font-serif italic text-secondary text-base">
                  “{primaryDateMemory.quoteHighlight}”
                </p>
              </div>
            )}

            {/* Photos if any */}
            {primaryDateMemory?.photos && primaryDateMemory.photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                {primaryDateMemory.photos.map((p, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden h-40">
                    <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsFullscreenDateOpen(false);
                  if (primaryDateMemory) {
                    onEditMemory(primaryDateMemory);
                  } else {
                    const mStr = String(calendarMonth + 1).padStart(2, '0');
                    const dStr = String(selectedDay).padStart(2, '0');
                    const targetIso = `${calendarYear}-${mStr}-${dStr}`;
                    onEditMemory({
                      id: `mem-${Date.now()}`,
                      keepsakeNumber: memories.length + 1,
                      volumeNumber: 1,
                      dateISO: targetIso,
                      timeFormatted: 'All Day',
                      title: '',
                      snippet: '',
                      storyBody: '',
                      quoteHighlight: '',
                      signOffAuthor: profile.partner1Name,
                      location: 'Bogo City, Cebu',
                      weatherTemp: '',
                      weatherConditions: '',
                      moodVibe: '',
                      vibeTags: [],
                      categories: ['PHOTO'],
                      dotIndicators: ['GOLD'],
                      photos: [],
                      partnerNotes: [],
                      isSealed: false,
                      isDraft: false,
                      sealLabel: 'Capybara Wax Seal',
                      sealIcon: 'verified',
                      updatedAt: Date.now(),
                      sortOrder: 0,
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider font-semibold shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {primaryDateMemory ? 'edit' : 'add_circle'}
                </span>
                <span>{primaryDateMemory ? 'Edit in Composer' : 'Write in Composer'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreenDateOpen(false)}
                className="text-secondary hover:text-primary text-xs uppercase tracking-wider font-medium"
              >
                Exit Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
