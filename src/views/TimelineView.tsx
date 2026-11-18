// (2026-07-13) Add useRef for gesture handling; was without useRef
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
// (2026-07-13) Import AudioMemo and VideoCapsule; was missing
import {
  AudioMemo,
  CoupleProfile,
  DigitalLoveLetter,
  DotIndicator,
  KeepsakeMemory,
  PolaroidPhoto,
  SecretYearNote,
  VideoCapsule,
} from '../types';
// (2026-07-13) Import capitalizeFirstLetters to ensure proper casing; was omitted
import { calculateDaysTogether, formatDuration, formatStandardDate, getChapterNumber, capitalizeFirstLetters } from '../utils/dateFormat';
import { audioEngine } from '../utils/audioEngine';
import { CustomDropdown } from '../components/CustomDropdown';
// (2026-07-13) Import DB in TimelineView for date queries; was unimported
import { DB } from '../db/localDb';

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
  // (2026-07-13) Add onSaveMemory prop for in-page date editing; was none
  onSaveMemory?: (memory: KeepsakeMemory, isDraft: boolean) => void;
  // (2026-07-13) Pass active calendar year & month to notepad; was no args
  onOpenMonthlyNotepad?: (year?: number, month?: number) => void;
}

// (2026-07-13) Format date with weekday for easy date identification; was plain
function formatDateWithWeekday(dateInput: string | undefined): string {
  if (!dateInput) return 'Jan 1, 2026';
  try {
    const [y, m, d] = dateInput.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateInput;
  }
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
          {/* (2026-07-13) Format date with weekday badge for clarity; was month/day */}
          <span className="px-2 py-0.5 rounded-md bg-surface-container text-primary font-label-md text-xs font-semibold uppercase tracking-wider border border-outline-variant/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-secondary">event</span>
            <span>{formatDateWithWeekday(memory.dateISO)}</span>
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
        {/* (2026-07-13) Add big memory icon before card title; was plain title */}
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-serif leading-snug mb-space-xs group-hover:text-secondary transition-colors flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[24px] sm:text-[28px] text-secondary shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            auto_awesome
          </span>
          {/* (2026-07-13) Capitalize memory title; was raw memory.title */}
          <span>{capitalizeFirstLetters(memory.title) || 'Untitled Memory'}</span>
        </h2>
        {/* (2026-07-13) Auto-capitalize snippet lines; was raw text */}
        <p className="font-body-md text-body-md text-on-surface-variant mb-space-md font-serif italic leading-relaxed clamp-3 whitespace-pre-line">
          “{capitalizeFirstLetters(memory.snippet || memory.storyBody)}”
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
          {/* (2026-07-13) Format dynamic chapter label from courting date; was fixed II */}
          <span className="font-label-md text-label-md text-on-surface-variant font-serif truncate-single">
            {memory.isDraft
              ? 'Saved Draft on Desk'
              : (memory.sealLabel
                  ? memory.sealLabel.replace(/Chapter\s+(?:II|11|\d+)/i, `Chapter ${getChapterNumber(memory.dateISO)}`)
                  : `Sealed in Chapter ${getChapterNumber(memory.dateISO)}`)}
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

// (2026-07-13) Month names and years for clickable calendar header; was none
const CALENDAR_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CALENDAR_YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

interface StoredCalendarState {
  year: number;
  month: number;
  selectedDay: number | null;
  lastActiveAt: number;
}

const CALENDAR_INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

// (2026-07-13) Restore opened month on reload, reset after 5m idle; was fixed now
function getInitialCalendarState(): { year: number; month: number; selectedDay: number | null } {
  const now = new Date();
  const defaultState = {
    year: now.getFullYear(),
    month: now.getMonth(),
    selectedDay: now.getDate(),
  };
  try {
    const raw = localStorage.getItem('ok_calendar_view_state');
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<StoredCalendarState>;
    const lastActive = typeof parsed.lastActiveAt === 'number' ? parsed.lastActiveAt : 0;
    if (Date.now() - lastActive > CALENDAR_INACTIVITY_LIMIT_MS) {
      return defaultState;
    }
    if (
      typeof parsed.year === 'number' &&
      typeof parsed.month === 'number' &&
      parsed.month >= 0 &&
      parsed.month <= 11
    ) {
      return {
        year: parsed.year,
        month: parsed.month,
        selectedDay: typeof parsed.selectedDay === 'number' ? parsed.selectedDay : null,
      };
    }
  } catch {
    // Ignore error
  }
  return defaultState;
}

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
  // (2026-07-13) Destructure onOpenMonthlyNotepad and onSaveMemory; was unpassed
  onOpenMonthlyNotepad,
  onSaveMemory,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'ALL' | 'PHOTO' | 'VOICE_MEMO' | 'VIDEO' | 'ANNIVERSARY' | 'DRAFT'
  >('ALL');
  const [dotFilter, setDotFilter] = useState<'ALL' | DotIndicator>('ALL');
  const [sortBy, setSortBy] = useState<'custom' | 'newest' | 'oldest'>('custom');
  // (2026-07-13) Add month and year popover picker states; was non-interactive text
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  // (2026-07-13) Restore opened month on reload & 5m idle reset; was new Date()
  const [calendarYear, setCalendarYear] = useState<number>(() => getInitialCalendarState().year);
  const [calendarMonth, setCalendarMonth] = useState<number>(() => getInitialCalendarState().month);
  const [selectedDay, setSelectedDay] = useState<number | null>(() => getInitialCalendarState().selectedDay);
  // (2026-07-13) Paginated scrolling for older memories; was unpaginated list
  const [visibleMemoriesCount, setVisibleMemoriesCount] = useState<number>(10);
  // (2026-07-13) Slide animation and vertical scroll support; was instant fade
  const [isFullscreenDateOpen, setIsFullscreenDateOpen] = useState<boolean>(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(false);
  const [isOverlayClosing, setIsOverlayClosing] = useState<boolean>(false);
  const [dateSlideStage, setDateSlideStage] = useState<
    'idle' | 'sliding-out-left' | 'sliding-out-right' | 'sliding-in-left' | 'sliding-in-right'
  >('idle');
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isHorizontalGestureRef = useRef<boolean | null>(null);
  // (2026-07-13) Add swipe state & refs for month swiping; was buttons only
  const [calendarDragX, setCalendarDragX] = useState(0);
  const [isCalendarSwiping, setIsCalendarSwiping] = useState(false);
  const calSwipeStartXRef = useRef<number | null>(null);
  const calSwipeStartYRef = useRef<number | null>(null);
  const calSwipeHorizontalRef = useRef<boolean | null>(null);
  const calSuppressClickRef = useRef(false);

  const openDateOverlay = (day: number) => {
    setSelectedDay(day);
    setIsFullscreenDateOpen(true);
    setIsOverlayClosing(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsOverlayVisible(true);
      });
    });
  };

  // (2026-07-13) Bypass overlay delay if closed; was unconditional timeout
  const closeDateOverlay = (callback?: () => void) => {
    if (!isFullscreenDateOpen) {
      if (callback) callback();
      return;
    }
    setIsOverlayClosing(true);
    setIsOverlayVisible(false);
    setTimeout(() => {
      setIsFullscreenDateOpen(false);
      setIsOverlayClosing(false);
      if (callback) callback();
    }, 280);
  };

  // (2026-07-13) Lock scroll and bind Escape for date overlay; was unmanaged
  useEffect(() => {
    if (!isFullscreenDateOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDateOverlay();
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreenDateOpen]);

  // (2026-07-13) Persist opened calendar state to storage; was unpersisted
  useEffect(() => {
    try {
      const state: StoredCalendarState = {
        year: calendarYear,
        month: calendarMonth,
        selectedDay,
        lastActiveAt: Date.now(),
      };
      localStorage.setItem('ok_calendar_view_state', JSON.stringify(state));
    } catch {
      // Ignore
    }
  }, [calendarYear, calendarMonth, selectedDay]);

  // (2026-07-13) Refresh calendar to current date after 5m idle; was unrefreshed
  useEffect(() => {
    let timer: number | null = null;

    const resetToToday = () => {
      const now = new Date();
      setCalendarYear(now.getFullYear());
      setCalendarMonth(now.getMonth());
      setSelectedDay(now.getDate());
      try {
        const state: StoredCalendarState = {
          year: now.getFullYear(),
          month: now.getMonth(),
          selectedDay: now.getDate(),
          lastActiveAt: Date.now(),
        };
        localStorage.setItem('ok_calendar_view_state', JSON.stringify(state));
      } catch {
        // Ignore
      }
    };

    const scheduleTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(resetToToday, CALENDAR_INACTIVITY_LIMIT_MS);
    };

    const handleUserActivity = () => {
      try {
        const raw = localStorage.getItem('ok_calendar_view_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.lastActiveAt = Date.now();
          localStorage.setItem('ok_calendar_view_state', JSON.stringify(parsed));
        }
      } catch {
        // Ignore
      }
      scheduleTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const raw = localStorage.getItem('ok_calendar_view_state');
          if (raw) {
            const parsed = JSON.parse(raw);
            const timeSince = Date.now() - (parsed.lastActiveAt || 0);
            if (timeSince > CALENDAR_INACTIVITY_LIMIT_MS) {
              resetToToday();
              return;
            }
          }
        } catch {
          // Ignore
        }
        scheduleTimer();
      }
    };

    scheduleTimer();
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'];
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true })
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timer) window.clearTimeout(timer);
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, handleUserActivity)
      );
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleNextOverlayDate = () => {
    if (selectedDay === null || dateSlideStage !== 'idle') return;
    setDateSlideStage('sliding-out-left');
    setTimeout(() => {
      const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
      if (selectedDay < daysInCurrentMonth) {
        setSelectedDay((d) => (d ? d + 1 : 1));
      } else {
        if (calendarMonth === 11) {
          setCalendarMonth(0);
          setCalendarYear((y) => y + 1);
        } else {
          setCalendarMonth((m) => m + 1);
        }
        setSelectedDay(1);
      }
      setDateSlideStage('sliding-in-right');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDateSlideStage('idle');
        });
      });
    }, 220);
  };

  const handlePrevOverlayDate = () => {
    if (selectedDay === null || dateSlideStage !== 'idle') return;
    setDateSlideStage('sliding-out-right');
    setTimeout(() => {
      if (selectedDay > 1) {
        setSelectedDay((d) => (d ? d - 1 : 1));
      } else {
        const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
        const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
        const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
        setCalendarMonth(prevMonth);
        setCalendarYear(prevYear);
        setSelectedDay(daysInPrevMonth);
      }
      setDateSlideStage('sliding-in-left');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDateSlideStage('idle');
        });
      });
    }, 220);
  };
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
    // (2026-07-13) Filter reactive memories prop; was DB.getMemoriesByDateSync
    return memories.filter((m) => m.dateISO === targetIso);
  }, [calendarYear, calendarMonth, selectedDay, memories]);

  const primaryDateMemory = selectedDayMemories[0] || null;

  // (2026-07-13) Aggregate polaroids, VMs, and videos for date; was photos only
  const allDatePhotos = useMemo(() => {
    return selectedDayMemories.flatMap((m) => m.photos || []);
  }, [selectedDayMemories]);

  const allDateAudio = useMemo(() => {
    return selectedDayMemories
      .map((m) => m.audioMemo)
      .filter((a): a is AudioMemo => !!a && (!!a.url || (!!a.synthNotes && a.synthNotes.length > 0)));
  }, [selectedDayMemories]);

  const allDateVideos = useMemo(() => {
    return selectedDayMemories
      .map((m) => m.videoCapsule)
      .filter((v): v is VideoCapsule => !!v && !!v.url);
  }, [selectedDayMemories]);

  // (2026-07-13) Pass explicit ISO date to open composer for existing date; was implicit
  const handleOpenComposerForDate = (explicitIso?: string) => {
    let targetIso: string;
    if (typeof explicitIso === 'string' && explicitIso) {
      targetIso = explicitIso;
    } else {
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dStr = String(selectedDay || 1).padStart(2, '0');
      targetIso = `${calendarYear}-${mStr}-${dStr}`;
    }

    const memoryForDate = memories.find((m) => m.dateISO === targetIso) || null;
    const memoryToEdit: KeepsakeMemory = memoryForDate || {
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
      // (2026-07-13) Set default vibeTags to empty array; was hardcoded default tags
      vibeTags: [],
      categories: ['PHOTO'],
      // (2026-07-13) Default dotIndicators to MOCHA only; was GOLD and MOCHA
      dotIndicators: ['MOCHA'],
      photos: [],
      partnerNotes: [],
      isSealed: false,
      isDraft: false,
      // (2026-07-13) Set sealLabel with dynamic chapter number; was Capybara Wax Seal
      sealLabel: `Sealed in Chapter ${getChapterNumber(targetIso, profile.courtingDateISO || '2025-11-07')}`,
      sealIcon: 'verified',
      updatedAt: Date.now(),
      sortOrder: 0,
    };
    // (2026-07-13) Open composer immediately when closed; was closeDateOverlay
    if (isFullscreenDateOpen) {
      closeDateOverlay(() => onEditMemory(memoryToEdit));
    } else {
      onEditMemory(memoryToEdit);
    }
  };

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

  // (2026-07-13) Calculate courting vs anniversary days; was single start date
  const daysCourting = useMemo(() => {
    return calculateDaysTogether(profile.courtingDateISO || '2025-11-07');
  }, [profile.courtingDateISO]);

  const daysKnowing = useMemo(() => {
    return calculateDaysTogether(profile.meetingDateISO || '2025-09-14');
  }, [profile.meetingDateISO]);

  const daysTogether = useMemo(() => {
    if (profile.anniversaryDateISO) {
      return calculateDaysTogether(profile.anniversaryDateISO);
    }
    return daysCourting;
  }, [profile.anniversaryDateISO, daysCourting]);

  // (2026-07-13) Set only milestone to Nov 7, 2025 courted her; was Sept 14
  const pastMilestone = useMemo(() => {
    const found = memories.find((m) => m.dateISO === '2025-11-07');
    if (found) {
      return {
        id: found.id,
        title: found.title || 'The Day I Courted Her',
        dateFormatted: 'Nov 7, 2025',
        tag: 'Milestone',
      };
    }
    return {
      id: null,
      title: profile.milestoneTitle || 'The Day I Courted Her',
      dateFormatted: profile.milestoneDateLabel || 'Nov 7, 2025',
      tag: profile.milestoneTag || 'Milestone',
    };
  }, [memories, profile]);

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

  // (2026-07-13) Auto-load more older memories on scroll; was unpaginated feed
  useEffect(() => {
    setVisibleMemoriesCount(10);
  }, [searchQuery, selectedDay, activeCategory, dotFilter]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 380
      ) {
        setVisibleMemoriesCount((prev) => Math.min(filteredMemories.length, prev + 10));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredMemories.length]);

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

  // (2026-07-13) Handle touch/mouse horizontal swipe to switch months; was none
  const handleCalendarPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (monthPickerOpen || yearPickerOpen) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    calSwipeStartXRef.current = e.clientX;
    calSwipeStartYRef.current = e.clientY;
    calSwipeHorizontalRef.current = null;
    setIsCalendarSwiping(false);
    setCalendarDragX(0);
  };

  const handleCalendarPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (calSwipeStartXRef.current === null || calSwipeStartYRef.current === null) return;
    const dx = e.clientX - calSwipeStartXRef.current;
    const dy = e.clientY - calSwipeStartYRef.current;

    if (calSwipeHorizontalRef.current === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.1) {
        calSwipeHorizontalRef.current = true;
        setIsCalendarSwiping(true);
      } else {
        calSwipeHorizontalRef.current = false;
        return;
      }
    }

    if (calSwipeHorizontalRef.current) {
      setCalendarDragX(Math.max(-90, Math.min(90, dx * 0.55)));
    }
  };

  const handleCalendarPointerEnd = (e: React.PointerEvent<HTMLElement>) => {
    if (calSwipeStartXRef.current === null) return;
    const dx = e.clientX - calSwipeStartXRef.current;
    const wasHorizontal = calSwipeHorizontalRef.current === true;

    calSwipeStartXRef.current = null;
    calSwipeStartYRef.current = null;
    calSwipeHorizontalRef.current = null;
    setIsCalendarSwiping(false);
    setCalendarDragX(0);

    if (wasHorizontal && Math.abs(dx) >= 48) {
      calSuppressClickRef.current = true;
      window.setTimeout(() => {
        calSuppressClickRef.current = false;
      }, 60);
      if (dx < 0) {
        handleNextMonth();
      } else {
        handlePrevMonth();
      }
    }
  };

  const handleCalendarClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (calSuppressClickRef.current) {
      e.stopPropagation();
      e.preventDefault();
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
          {/* (2026-07-13) Dynamic current chapter title; was fixed Chapter II */}
          <span className="font-label-md text-label-md uppercase tracking-widest text-on-secondary-container">
            {profile.chapterTitle
              ? profile.chapterTitle.replace(/Chapter\s+(?:II|11|\d+)/i, `Chapter ${getChapterNumber(undefined, profile.courtingDateISO || '2025-11-07')}`)
              : `Chapter ${getChapterNumber(undefined, profile.courtingDateISO || '2025-11-07')} • ${profile.partner1Name} & ${profile.partner2Name}`}
          </span>
        </div>
        {/* (2026-07-13) Display courting stage banner vs official anniversary */}
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight font-serif mb-1">
          {profile.anniversaryDateISO
            ? `Together for ${daysTogether} Days`
            : `Courting for ${daysCourting} Days`}
        </h1>
        <div className="flex items-center gap-1.5 text-[11px] text-outline font-medium mb-1">
          <span>Met Sept 14, 2025 ({daysKnowing} days)</span>
          <span>•</span>
          <span>Courting Since Nov 7, 2025</span>
        </div>
        {/* (2026-07-13) Fallback to answered prayer quote; was unhandled heroQuote */}
        <p className="font-body-md text-body-md text-on-surface-variant max-w-[320px] italic font-serif">
          “{profile.heroQuote && !profile.heroQuote.includes('no heart for me like yours') ? profile.heroQuote : "You're an answered prayer, baby."}”
        </p>

        {/* (2026-07-13) Support past milestone banner card; was static rendezvous only */}
        {profile.showNextRendezvous ? (
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
        ) : (
          <div
            id="past-milestone-card" // Cherished past milestone banner card
            onClick={() =>
              pastMilestone.id ? onOpenMemory(pastMilestone.id) : onOpenProfileModal()
            }
            className="mt-space-md w-full bg-[#fbf5ee] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-md relative overflow-hidden cursor-pointer border-2 border-[#dfcbb7] hover:border-primary/50 hover:shadow-lg transition-all active:scale-[0.99] group"
          >
            <div className="absolute -right-3 -bottom-3 opacity-10 text-primary pointer-events-none group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-[64px]">celebration</span>
            </div>

            <div className="flex items-center gap-3.5 min-w-0 z-10">
              <div className="w-12 h-12 rounded-xl bg-[#c58a69] text-white flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">celebration</span>
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="font-label-md text-[11px] font-bold text-secondary tracking-widest uppercase">
                  Past Milestone • {profile.partner1Name} &amp; {profile.partner2Name}
                </span>
                <span className="font-headline-sm text-headline-sm text-primary font-bold truncate-single font-serif mt-0.5">
                  {pastMilestone.title}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end flex-shrink-0 pl-3 z-10">
              <span className="px-3 py-1 rounded-full bg-[#c58a69] text-white font-label-md text-xs font-semibold shadow-xs">
                {pastMilestone.dateFormatted}
              </span>
              <span className="font-body-sm text-xs font-semibold text-secondary mt-1">
                {pastMilestone.tag}
              </span>
            </div>
          </div>
        )}
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
          {/* (2026-07-13) Add Rose Intimacy & Burgundy Milestone filter options; was 3 */}
          <CustomDropdown
            options={[
              { value: 'ALL', label: 'All Dot Colors', icon: 'palette' },
              { value: 'GOLD', label: 'Gold • Events', icon: 'event' },
              { value: 'MOCHA', label: 'Mocha • Date', icon: 'calendar_month' },
              { value: 'ROSE', label: 'Rose • Intimacy', icon: 'favorite' },
              { value: 'BURGUNDY', label: 'Burgundy • Milestone', icon: 'stars' },
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

      {/* (2026-07-13) Enable left/right month swipe on calendar card; was buttons */}
      <section
        id="keepsake-monthly-calendar-card" // Monthly calendar card with Google Fonts
        onPointerDown={handleCalendarPointerDown}
        onPointerMove={handleCalendarPointerMove}
        onPointerUp={handleCalendarPointerEnd}
        onPointerCancel={handleCalendarPointerEnd}
        onPointerLeave={handleCalendarPointerEnd}
        onClickCapture={handleCalendarClickCapture}
        className="relative bg-surface-container-lowest rounded-2xl shadow-md p-space-md mb-space-lg overflow-hidden border border-outline-variant/35 touch-pan-y select-none"
      >
        {/* (2026-07-13) Responsive single-row calendar header; was broken line break */}
        <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/40 mb-space-sm gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-95 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span
              className="material-symbols-outlined text-[15px] text-secondary flex-shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
            {/* (2026-07-13) Tighten month-year gap; was gap-1 with px-1 padding */}
            <div className="flex items-center gap-0">
              {/* Clickable Month Word */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => {
                    setMonthPickerOpen((prev) => !prev);
                    setYearPickerOpen(false);
                  }}
                  className="calendar-header-font text-base sm:text-[21px] font-semibold text-primary tracking-tight whitespace-nowrap hover:text-secondary transition-colors cursor-pointer rounded-lg px-0.5 py-0.5 hover:bg-surface-container-low active:scale-95"
                  title="Click to select month"
                >
                  <span>{CALENDAR_MONTH_NAMES[calendarMonth]}</span>
                </button>

                {monthPickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setMonthPickerOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 z-40 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xl p-2.5 w-56 grid grid-cols-3 gap-1.5 animate-fadeIn">
                      {CALENDAR_MONTH_NAMES.map((name, idx) => {
                        const isCurr = idx === calendarMonth;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setCalendarMonth(idx);
                              setSelectedDay(null);
                              setMonthPickerOpen(false);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-serif font-medium transition-all ${
                              isCurr
                                ? 'bg-primary text-on-primary font-bold shadow-xs'
                                : 'hover:bg-surface-container text-primary'
                            }`}
                          >
                            {name.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Clickable Year Word */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => {
                    setYearPickerOpen((prev) => !prev);
                    setMonthPickerOpen(false);
                  }}
                  // (2026-07-13) Tighten year button padding; was px-1
                  className="calendar-header-font text-base sm:text-[21px] font-semibold text-primary tracking-tight whitespace-nowrap hover:text-secondary transition-colors cursor-pointer rounded-lg px-0.5 py-0.5 hover:bg-surface-container-low active:scale-95"
                  title="Click to select year"
                >
                  <span>{calendarYear}</span>
                </button>

                {yearPickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setYearPickerOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 z-40 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-xl p-2.5 w-44 grid grid-cols-2 gap-1.5 animate-fadeIn">
                      {CALENDAR_YEARS.map((y) => {
                        const isCurr = y === calendarYear;
                        return (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              setCalendarYear(y);
                              setSelectedDay(null);
                              setYearPickerOpen(false);
                            }}
                            className={`py-1.5 px-2 rounded-xl text-xs font-serif font-medium transition-all ${
                              isCurr
                                ? 'bg-primary text-on-primary font-bold shadow-xs'
                                : 'hover:bg-surface-container text-primary'
                            }`}
                          >
                            {y}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-95 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* (2026-07-13) Remove Keepsake chip & open notepad on active month; was chip */}
            {onOpenMonthlyNotepad && (
              <button
                type="button"
                onClick={() => onOpenMonthlyNotepad(calendarYear, calendarMonth)}
                title="Open Monthly Notepad"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-low text-secondary hover:text-primary transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">sticky_note_2</span>
              </button>
            )}
          </div>
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

        {/* (2026-07-13) Translate calendar grid on horizontal swipe; was static */}
        <div
          className={`grid grid-cols-7 gap-y-1.5 text-center calendar-num-font text-[13.5px] ${
            isCalendarSwiping ? '' : 'transition-transform duration-200 ease-out'
          }`}
          style={{ transform: calendarDragX ? `translateX(${calendarDragX}px)` : undefined }}
        >
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
                // (2026-07-13) Open date overlay on calendar click; was setSelectedDay
                onClick={() => openDateOverlay(cell.day)}
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
                    {/* (2026-07-13) Render BURGUNDY milestone dot in calendar cell; was none */}
                    {cell.dots.includes('BURGUNDY') && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: '#8B263E' }}
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
                // (2026-07-13) Open Monthly Notepad on active calendar month; was default
                onClick={() => onOpenMonthlyNotepad(calendarYear, calendarMonth)}
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
                // (2026-07-13) Clear day filter without resetting month; was resetting month
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
                // (2026-07-13) Open date overlay on week strip click; was setSelectedDay
                onClick={() => openDateOverlay(item.day)}
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
                  {/* (2026-07-13) Render BURGUNDY milestone dot in sliding strip; was none */}
                  {item.dots.includes('BURGUNDY') && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#8B263E' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* (2026-07-13) Improve date peep card design; was cramped repetitive card */}
      {selectedDay !== null && (
        <div
          id="selected-day-peep-card"
          className="mb-space-lg bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant/35 flex flex-col gap-3 relative overflow-hidden"
        >
          {/* Top meta bar */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-outline-variant/20">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-secondary text-xs font-semibold font-['Plus_Jakarta_Sans',sans-serif]">
              <span className="material-symbols-outlined text-[15px] text-tertiary-container">
                calendar_today
              </span>
              <span>{selectedDayFormatted}</span>
            </div>
            {/* (2026-07-13) Remove Clear Filter button from peep card; was Clear Filter */}
          </div>

          {/* Moment title and note */}
          <div>
            {/* (2026-07-13) Add icon on left of recorded moment label; was text only */}
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`material-symbols-outlined text-[15px] shrink-0 ${
                  primaryDateMemory ? 'text-secondary' : 'text-outline/70'
                }`}
                style={primaryDateMemory ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {primaryDateMemory ? 'auto_awesome' : 'edit_note'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">
                {primaryDateMemory ? 'Recorded Moment' : 'Unwritten Page'}
              </span>
            </div>
            {/* (2026-07-13) Gray out unwritten quiet day title; was always text-primary */}
            <h3
              className={`font-['Playfair_Display',Georgia,serif] text-xl sm:text-2xl leading-tight flex items-center gap-2 ${
                primaryDateMemory ? 'text-primary font-bold' : 'text-outline/70 font-normal italic'
              }`}
            >
              {primaryDateMemory && (
                <span
                  className="material-symbols-outlined text-[24px] sm:text-[28px] text-secondary shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  auto_awesome
                </span>
              )}
              {/* (2026-07-13) Capitalize date peep title; was raw title */}
              <span>{primaryDateMemory ? capitalizeFirstLetters(primaryDateMemory.title) : 'A Quiet Day in Our Story'}</span>
            </h3>
            <p
              className={`font-['Cormorant_Garamond',serif] italic text-sm sm:text-base leading-relaxed mt-1 line-clamp-3 whitespace-pre-line ${
                primaryDateMemory ? 'text-on-surface-variant' : 'text-outline/60'
              }`}
            >
              “{capitalizeFirstLetters(primaryDateMemory?.snippet || primaryDateMemory?.storyBody || `No memories recorded for this specific date yet. Every moment with ${profile.partner2Name} is a keepsake waiting to be written.`)}”
            </p>
          </div>

          {/* Media quick badges if attached */}
          {primaryDateMemory &&
            (primaryDateMemory.photos?.length > 0 ||
              primaryDateMemory.audioMemo ||
              primaryDateMemory.videoCapsule) && (
              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                {primaryDateMemory.photos?.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary text-[11px] font-medium flex items-center gap-1 border border-outline-variant/20">
                    <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                    <span>
                      {primaryDateMemory.photos.length} Photo{primaryDateMemory.photos.length > 1 ? 's' : ''}
                    </span>
                  </span>
                )}
                {primaryDateMemory.audioMemo && (
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary text-[11px] font-medium flex items-center gap-1 border border-outline-variant/20">
                    <span className="material-symbols-outlined text-[13px]">mic</span>
                    <span>Voice Memo</span>
                  </span>
                )}
                {primaryDateMemory.videoCapsule && (
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary text-[11px] font-medium flex items-center gap-1 border border-outline-variant/20">
                    <span className="material-symbols-outlined text-[13px]">movie</span>
                    <span>Video</span>
                  </span>
                )}
              </div>
            )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={() => handleOpenComposerForDate()}
              className="flex-1 py-2 px-4 rounded-xl bg-primary text-on-primary font-['Plus_Jakarta_Sans',sans-serif] text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-primary/95 transition-all active:scale-98"
            >
              <span className="material-symbols-outlined text-[16px]">
                {primaryDateMemory ? 'edit_note' : 'add_circle'}
              </span>
              <span>{primaryDateMemory ? 'Edit in Keepsake Box' : 'Write Keepsake'}</span>
            </button>

            <button
              type="button"
              onClick={() => openDateOverlay(selectedDay)}
              className="py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-['Plus_Jakarta_Sans',sans-serif] text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-1 border border-outline-variant/25 transition-all active:scale-98"
              title="Open full date presentation view"
            >
              <span className="material-symbols-outlined text-[16px]">fullscreen</span>
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>
      )}

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
            {/* (2026-07-13) Paginated memories with scroll trigger; was unpaginated feed */}
            <SortableContext
              items={filteredMemories.slice(0, visibleMemoriesCount).map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-space-lg">
                {filteredMemories.slice(0, visibleMemoriesCount).map((memory) => (
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
            {visibleMemoriesCount < filteredMemories.length && (
              <div id="older-memories-load-trigger" className="flex justify-center pt-4 pb-2">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleMemoriesCount((prev) =>
                      Math.min(filteredMemories.length, prev + 10)
                    )
                  }
                  className="px-5 py-2.5 rounded-xl bg-surface-container-low text-primary font-label-md text-xs uppercase tracking-wider border border-outline-variant/40 flex items-center gap-2 hover:bg-surface-container shadow-xs active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    history
                  </span>
                  <span>
                    Load Older Memories ({filteredMemories.length - visibleMemoriesCount} more)
                  </span>
                </button>
              </div>
            )}
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

      {/* (2026-07-13) Inset for Samsung 3-button navbar; was unpadded bottom */}
      {isFullscreenDateOpen && selectedDay !== null && typeof document !== 'undefined' && createPortal(
        <div
          id="specific-date-fullscreen-view"
          style={{
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 36px))',
          }}
          // (2026-07-13) Full-bleed blurred top safe-area inset; was py-4 gap
          className={`fixed inset-0 z-[100] bg-background text-on-surface overflow-y-auto overscroll-y-contain pt-0 pb-4 md:pb-6 select-text no-print transition-transform duration-300 ease-out ${
            !isOverlayVisible || isOverlayClosing
              ? 'translate-x-full pointer-events-none'
              : 'translate-x-0'
          }`}
        >
          {/* Subtle paper dot background texture */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#4a3b32_1px,transparent_1px)] [background-size:20px_20px] -z-10" />

          {/* (2026-07-13) Enforce webkit/standard blur over APK top inset; was unblurred */}
          <div
            style={{
              paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
              WebkitBackdropFilter: 'blur(20px)',
              backdropFilter: 'blur(20px)',
            }}
            className="w-full sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-outline-variant/15 pb-3 px-4 md:px-8"
          >
            <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => closeDateOverlay()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high/90 text-primary border border-outline-variant/30 text-[13px] font-medium shadow-sm hover:bg-surface-variant transition-colors active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to Timeline</span>
              </button>
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={handlePrevOverlayDate}
                  title="Previous Date"
                  className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-90 shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="text-[11px] uppercase font-bold tracking-widest text-secondary bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/30 truncate">
                  {selectedDayFormatted}
                </span>
                <button
                  type="button"
                  onClick={handleNextOverlayDate}
                  title="Next Date"
                  className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-90 shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button
                  type="button"
                  onClick={() => closeDateOverlay()}
                  title="Close overlay"
                  className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-90 ml-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
          </div>

          {/* Centered Column Wrapper for robust vertical scrolling */}
          <div className="w-full max-w-xl mx-auto px-4 md:px-8 pt-3 flex flex-col items-center min-h-full pb-36">

            {/* Date Content Card that animates horizontally */}
            <div
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  touchStartXRef.current = e.touches[0].clientX;
                  touchStartYRef.current = e.touches[0].clientY;
                  isHorizontalGestureRef.current = null;
                }
              }}
              onTouchMove={(e) => {
                if (touchStartXRef.current === null || touchStartYRef.current === null) return;
                const deltaX = e.touches[0].clientX - touchStartXRef.current;
                const deltaY = e.touches[0].clientY - touchStartYRef.current;
                if (isHorizontalGestureRef.current === null) {
                  if (Math.abs(deltaY) > 8 && Math.abs(deltaY) >= Math.abs(deltaX)) {
                    isHorizontalGestureRef.current = false;
                    return;
                  } else if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    isHorizontalGestureRef.current = true;
                    setIsDraggingHorizontal(true);
                    setDragDeltaX(deltaX);
                  }
                } else if (isHorizontalGestureRef.current === true) {
                  setDragDeltaX(deltaX);
                }
              }}
              onTouchEnd={() => {
                if (isHorizontalGestureRef.current === true) {
                  if (dragDeltaX < -45) {
                    handleNextOverlayDate();
                  } else if (dragDeltaX > 45) {
                    handlePrevOverlayDate();
                  }
                }
                setIsDraggingHorizontal(false);
                setDragDeltaX(0);
                touchStartXRef.current = null;
                touchStartYRef.current = null;
                isHorizontalGestureRef.current = null;
              }}
              style={{
                transform: isDraggingHorizontal
                  ? `translateX(${dragDeltaX * 0.75}px)`
                  : dateSlideStage === 'sliding-out-left'
                  ? 'translateX(-100%)'
                  : dateSlideStage === 'sliding-out-right'
                  ? 'translateX(100%)'
                  : dateSlideStage === 'sliding-in-right'
                  ? 'translateX(100%)'
                  : dateSlideStage === 'sliding-in-left'
                  ? 'translateX(-100%)'
                  : 'translateX(0)',
                opacity:
                  dateSlideStage === 'sliding-out-left' ||
                  dateSlideStage === 'sliding-out-right' ||
                  dateSlideStage === 'sliding-in-right' ||
                  dateSlideStage === 'sliding-in-left'
                    ? 0
                    : 1,
                transition:
                  isDraggingHorizontal ||
                  dateSlideStage === 'sliding-in-right' ||
                  dateSlideStage === 'sliding-in-left'
                    ? 'none'
                    : 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease',
              }}
              className="w-full flex flex-col items-center"
            >

          {/* (2026-07-13) Add swipe hint in date overlay; was missing guidance */}
          <div className="flex items-center gap-1.5 text-[11px] text-secondary/80 font-medium mb-4 select-none">
            <span className="material-symbols-outlined text-[14px]">swipe</span>
            <span>Swipe left or right to switch dates</span>
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
            {/* (2026-07-13) Remove icon left of modal title; was auto_awesome */}
            <h2
              className={`font-['Playfair_Display',Georgia,serif] tracking-tight text-2xl md:text-3xl text-center ${
                primaryDateMemory ? 'text-primary font-semibold' : 'text-outline/70 font-normal italic'
              }`}
            >
              <span>{primaryDateMemory ? capitalizeFirstLetters(primaryDateMemory.title) || "Preserve Today's Chapter" : "Preserve Today's Chapter"}</span>
            </h2>
            {/* (2026-07-13) Gray out subtitle & pills when date is empty; was dark */}
            <p
              className={`mt-1 max-w-xs leading-relaxed font-['Cormorant_Garamond',serif] italic text-base ${
                primaryDateMemory ? 'text-secondary' : 'text-outline/60'
              }`}
            >
              Every little moment with {profile.partner2Name} is worth remembering forever.
            </p>
          </div>

          {/* Context Pills: Date & Time and Location & Vibe matching screenshot */}
          <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 font-['Plus_Jakarta_Sans',sans-serif]">
            <div
              className={`flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-full shadow-sm border border-outline-variant/30 ${
                primaryDateMemory ? 'text-primary' : 'text-outline/60 opacity-75'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    primaryDateMemory ? 'text-secondary' : 'text-outline/50'
                  }`}
                >
                  calendar_today
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">
                    Date
                  </span>
                  <span
                    className={`text-sm font-medium truncate-single ${
                      primaryDateMemory ? 'text-primary' : 'text-outline/60'
                    }`}
                  >
                    {selectedDayFormatted} • Whole Day Note
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-full shadow-sm border border-outline-variant/30 ${
                primaryDateMemory ? 'text-primary' : 'text-outline/60 opacity-75'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    primaryDateMemory ? 'text-tertiary-container' : 'text-outline/50'
                  }`}
                >
                  location_on
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-semibold">
                    Location
                  </span>
                  <span
                    className={`text-sm font-medium truncate-single ${
                      primaryDateMemory ? 'text-primary' : 'text-outline/60'
                    }`}
                  >
                    {primaryDateMemory?.location || 'Bogo City, Cebu'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* (2026-07-13) Refine parchment letter card typography; was oversized */}
          <article
            className={`w-full max-w-xl rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden flex flex-col border mb-8 ${
              primaryDateMemory
                ? 'bg-surface-container-lowest border-outline-variant/30'
                : 'bg-surface-container-low/70 border-outline-variant/25 font-[\'Plus_Jakarta_Sans\',sans-serif]'
            }`}
          >
            {primaryDateMemory ? (
              (() => {
                const overlayFormattedBody = capitalizeFirstLetters(
                  primaryDateMemory.storyBody || primaryDateMemory.snippet || 'A cherished day together.'
                );
                const overlayParas = overlayFormattedBody.split(/\n\n+/).filter(Boolean);
                const overlayFirstPara = overlayParas[0] || '';
                const overlayDropCap = overlayFirstPara.charAt(0).toUpperCase() || 'I';
                const overlayFirstRest = overlayFirstPara.slice(1);
                const overlayRestParas = overlayParas.slice(1);
                return (
                  <>
                    {/* (2026-07-13) Remove icon left of card title & size 2-line drop cap; was 30px */}
                    <header className="mb-4 relative z-10">
                      <h3 className="font-['Playfair_Display',Georgia,serif] text-lg sm:text-xl font-semibold text-primary tracking-tight leading-snug">
                        {capitalizeFirstLetters(primaryDateMemory.letterHeading || primaryDateMemory.title)}
                      </h3>
                      <div className="w-10 h-0.5 bg-secondary-container mt-2.5 rounded-full" />
                    </header>

                    <div id="heartfelt-note-view-container" className="relative z-10 text-on-surface-variant">
                      <p className="font-['Plus_Jakarta_Sans',Roboto,sans-serif] text-[14px] sm:text-[15px] text-on-surface/95 leading-[1.65] text-left mb-4 whitespace-pre-line">
                        <span className="float-left font-['Playfair_Display',Georgia,serif] text-[44px] sm:text-[48px] leading-[0.82] font-semibold text-secondary pr-2 pt-[3px]">
                          {overlayDropCap}
                        </span>
                        {overlayFirstRest}
                      </p>

                      {primaryDateMemory.quoteHighlight && (
                        <div className="px-4 py-3.5 bg-surface-container-low/65 rounded-xl my-4 border border-outline-variant/25">
                          {/* (2026-07-13) Increase quote font size; was text-[15px] sm:text-base */}
                          <p className="font-['Cormorant_Garamond',Georgia,serif] text-lg sm:text-xl font-medium text-secondary text-center italic leading-relaxed">
                            “{primaryDateMemory.quoteHighlight}”
                          </p>
                        </div>
                      )}

                      {overlayRestParas.map((para, i) => (
                        <p
                          key={i}
                          className="font-['Plus_Jakarta_Sans',Roboto,sans-serif] text-[14px] sm:text-[15px] text-on-surface/90 leading-[1.7] text-left mb-3 whitespace-pre-line"
                        >
                          {para}
                        </p>
                      ))}

                      <div className="relative mt-5 pt-3 flex flex-col items-end">
                        <div className="absolute -bottom-2 -right-1 w-28 h-16 opacity-[0.06] pointer-events-none select-none flex items-center justify-center">
                          <svg className="w-full h-full fill-primary" viewBox="0 0 120 75">
                            <path d="M15,45 C20,38 32,32 50,33 C68,34 82,25 92,25 C102,25 106,30 110,38 C113,44 112,52 108,58 C102,65 92,68 78,68 C55,68 35,66 22,64 C14,62 10,54 15,45 Z" />
                            <ellipse cx="98" cy="24" rx="4" ry="7" transform="rotate(-15 98 24)" />
                            <path
                              d="M102,34 C104,34 106,36 104,38"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeWidth="2"
                            />
                            <path
                              d="M88,32 Q93,35 97,32"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeWidth="2"
                            />
                            <circle className="fill-tertiary-fixed-dim" cx="80" cy="22" r="5" />
                            <path d="M80,17 Q82,14 84,15" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </div>
                        {/* (2026-07-13) Increase sign-off font sizes; was text-base & 10px */}
                        <span className="relative z-10 font-['Playfair_Display',Georgia,serif] text-lg sm:text-xl text-secondary italic">
                          Yours always,
                        </span>
                        <span className="relative z-10 font-['Plus_Jakarta_Sans',sans-serif] text-xs font-semibold uppercase tracking-[0.14em] text-outline mt-0.5">
                          {primaryDateMemory.signOffAuthor || `${profile.partner1Name} • St. ${primaryDateMemory.volumeNumber || 1}`}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              <>
                {/* Watermark in corner for empty state */}
                <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.05] pointer-events-none text-primary">
                  <svg fill="currentColor" viewBox="0 0 100 100">
                    <path d="M20 70c0-18 12-32 30-32 15 0 26 8 30 20 2 4 4 8 8 8h4c4 0 6 3 6 7s-3 7-6 7h-12c-5 0-8 3-10 6H20z" />
                    <circle cx="32" cy="48" r="4" />
                    <circle cx="56" cy="24" r="8" />
                  </svg>
                </div>

                <div className="mb-5 pb-3 border-b border-surface-container-high">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-semibold block mb-1">
                    Title of this moment
                  </span>
                  <h3 className="font-['Playfair_Display',Georgia,serif] text-xl sm:text-2xl text-outline/55 font-normal italic">
                    Sunday morning pastries and warm coffee...
                  </h3>
                </div>

                <div id="heartfelt-note-view-container">
                  <span className="text-[10px] uppercase tracking-wider text-outline font-semibold block mb-2">
                    The Heartfelt Note
                  </span>
                  <div className="min-h-[160px] font-['Plus_Jakarta_Sans',Roboto,sans-serif] text-[15px] sm:text-base leading-relaxed text-outline/55 italic">
                    <p className="whitespace-pre-wrap">
                      {capitalizeFirstLetters(
                        `Write down how ${profile.partner2Name} smiled, what she said, the quiet moments you never want to forget...`
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}

                {/* Polaroids Attached */}
                {allDatePhotos.length > 0 && (
                  <div className="mt-6 flex flex-col gap-4 w-full">
                    <span className="text-[10px] uppercase tracking-wider text-outline font-semibold block">
                      Polaroid Keepsakes ({allDatePhotos.length})
                    </span>
                    {allDatePhotos.map((photo, idx) => (
                      <div
                        key={photo.id || idx}
                        className="bg-[#faf8f5] p-3.5 pb-5 rounded-xl shadow-sm border border-outline-variant/35 text-center flex flex-col items-center"
                      >
                        <div className="w-full overflow-hidden rounded-lg bg-surface-container-high aspect-[4/3] mb-3">
                          <img
                            src={photo.url}
                            alt={photo.caption || 'Polaroid'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {photo.caption && (
                          <p className="font-['Cormorant_Garamond',serif] italic text-base text-primary/90 font-medium px-2">
                            “{photo.caption}”
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Voice Notes Attached */}
                {allDateAudio.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3 w-full">
                    <span className="text-[10px] uppercase tracking-wider text-outline font-semibold block">
                      Voice Memories &amp; Audio Notes
                    </span>
                    {allDateAudio.map((memo, idx) => {
                      const isCurrentTrack = audioState.currentTrackId === memo.id;
                      const isPlaying = isCurrentTrack && audioState.isPlaying;
                      return (
                        <div
                          key={memo.id || idx}
                          className="bg-[#342721] text-[#fbf9f4] rounded-2xl p-4 shadow-sm border border-[#48372e]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-[#cca440] text-[11px] font-bold uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[16px]">mic</span>
                              <span>Voice Note</span>
                            </div>
                            <span className="text-[10px] text-[#cca440]/90 font-mono uppercase tracking-wider">
                              WAV • Mastered
                            </span>
                          </div>
                          <p className="text-sm italic font-['Cormorant_Garamond',serif] text-[#f0e8e2] mb-3">
                            “{memo.title || 'Whispered note for Zea'}”
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.toggleTrack(
                                  memo.id,
                                  memo.durationSeconds || 42,
                                  memo.url,
                                  memo.synthNotes
                                );
                              }}
                              className="w-10 h-10 rounded-full bg-[#cca440] text-[#342721] flex items-center justify-center shadow-md active:scale-95 flex-shrink-0 transition-transform"
                            >
                              <span className="material-symbols-outlined text-[22px]">
                                {isPlaying ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                              <div className="flex items-center justify-between text-[11px] font-mono text-[#dcd4cd]">
                                <span>
                                  {isCurrentTrack ? formatDuration(audioState.currentTime) : '00:00'}
                                  {' / '}
                                  {memo.durationFormatted || '00:42'}
                                </span>
                                <span className="text-[10px] text-[#a4968d]">128 kbps</span>
                              </div>
                              <div className="h-1.5 bg-[#201814] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#cca440] transition-all duration-150"
                                  style={{
                                    width: `${
                                      isCurrentTrack
                                        ? (audioState.currentTime / Math.max(1, audioState.duration)) * 100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Videos Attached */}
                {allDateVideos.length > 0 && (
                  <div className="mt-6 flex flex-col gap-3 w-full">
                    <span className="text-[10px] uppercase tracking-wider text-outline font-semibold block">
                      Video Capsules
                    </span>
                    {allDateVideos.map((vid, idx) => (
                      <div
                        key={vid.id || idx}
                        className="rounded-2xl overflow-hidden shadow-sm border border-outline-variant/35 bg-surface-container-low"
                      >
                        <div className="px-4 py-2 flex items-center justify-between bg-surface-container-high/60 border-b border-outline-variant/20">
                          <div className="flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[16px]">videocam</span>
                            <span>{vid.title || 'Video Memory'}</span>
                          </div>
                          <span className="text-[10px] text-secondary font-mono">
                            {vid.durationFormatted || 'HD'}
                          </span>
                        </div>
                        <video
                          src={vid.url}
                          controls
                          className="w-full max-h-[300px] bg-black object-cover"
                          poster={vid.thumbnailUrl}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* (2026-07-13) Edit in ComposerView button; was toggle inline edit form */}
                <div className="mt-7 pt-4 border-t border-outline-variant/20 flex items-center justify-end w-full">
                  <button
                    type="button"
                    onClick={() => handleOpenComposerForDate()}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-primary text-on-primary font-['Plus_Jakarta_Sans',sans-serif] text-xs uppercase tracking-wider font-semibold shadow-sm hover:bg-primary/95 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {primaryDateMemory ? 'edit' : 'add_circle'}
                    </span>
                    <span>{primaryDateMemory ? 'Edit in Keepsake Box' : 'Write Keepsake for this Date'}</span>
                  </button>
                </div>
            {/* End Editorial Title & Ruled Note Card */}
          </article>
          {/* End Date Content Card */}
        </div>
        {/* End Centered Column Wrapper */}
      </div>
    </div>,
    document.body
  )}
    </div>
  );
};
