// (2026-07-13) Import createPortal for overlay-safe modals; was inline divs
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CoupleProfile, KeepsakeMemory, PolaroidPhoto } from '../types';
// (2026-07-13) Import capitalizeFirstLetters to ensure proper case; was missing
import { formatDuration, formatStandardDate, capitalizeFirstLetters } from '../utils/dateFormat';
import { audioEngine } from '../utils/audioEngine';

// (2026-07-13) Format long weekday date matching date overlay header; was short
function formatLongWeekdayDate(dateInput: string | undefined): string {
  if (!dateInput) return 'Sunday, Jan 1, 2026';
  try {
    const [y, m, d] = dateInput.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateInput || 'Sunday, Jan 1, 2026';
  }
}

interface StoryReaderViewProps {
  profile: CoupleProfile;
  memory: KeepsakeMemory;
  allMemories: KeepsakeMemory[];
  onSelectMemory: (id: string) => void;
  onBackToTimeline: () => void;
  onEditMemory: (memory: KeepsakeMemory) => void;
  onDeleteMemory: (id: string) => void;
  onAddPartnerNote: (memoryId: string, author: string, text: string) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
  // (2026-07-13) Allow embedding directly inside date overlay; was standalone only
  embeddedInOverlay?: boolean;
}

export const StoryReaderView: React.FC<StoryReaderViewProps> = ({
  profile,
  memory,
  allMemories,
  onSelectMemory,
  onBackToTimeline,
  onEditMemory,
  onDeleteMemory,
  onAddPartnerNote,
  onToast,
  embeddedInOverlay = false,
}) => {
  const [audioState, setAudioState] = useState(audioEngine.getState());
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
  const [noteAuthor, setNoteAuthor] = useState(profile.partner1Name);
  const [noteText, setNoteText] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState<PolaroidPhoto | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [lockscreenModalOpen, setLockscreenModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // (2026-07-13) Add swipe in/out animation state; was static reader
  const [isDismissing, setIsDismissing] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleCloseWithAnimation = () => {
    if (isDismissing) return;
    setIsDismissing(true);
    setTimeout(() => {
      onBackToTimeline();
    }, 240);
  };

  useEffect(() => {
    return audioEngine.subscribe(() => {
      setAudioState(audioEngine.getState());
    });
  }, []);

  useEffect(() => {
    const anyModal =
      noteDrawerOpen || Boolean(lightboxPhoto) || lockscreenModalOpen || deleteConfirmOpen;
    if (anyModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [noteDrawerOpen, lightboxPhoto, lockscreenModalOpen, deleteConfirmOpen]);

  const currentIdx = allMemories.findIndex((m) => m.id === memory.id);
  const prevMemory = currentIdx > 0 ? allMemories[currentIdx - 1] : null;
  const nextMemory =
    currentIdx >= 0 && currentIdx < allMemories.length - 1 ? allMemories[currentIdx + 1] : null;

  // (2026-07-13) Auto-capitalize all first letters of lines & sentences; was raw text
  const formattedBody = capitalizeFirstLetters(
    memory.storyBody || memory.snippet || 'A cherished day together.'
  );
  const paragraphs = formattedBody.split(/\n\n+/).filter(Boolean);
  const firstPara = paragraphs[0] || '';
  const dropCapChar = firstPara.charAt(0).toUpperCase() || 'I';
  const firstParaRest = firstPara.slice(1);
  const remainingParas = paragraphs.slice(1);

  const isPlayingAudio =
    memory.audioMemo &&
    audioState.currentTrackId === memory.audioMemo.id &&
    audioState.isPlaying;

  const handleSavePartnerNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddPartnerNote(memory.id, noteAuthor.trim() || profile.partner1Name, noteText.trim());
    setNoteText('');
    setNoteDrawerOpen(false);
    onToast(`Note sealed onto "${memory.title}" for ${profile.partner2Name}!`, 'success');
  };

  const handleDownloadLockscreenWallpaper = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Warm Linen background
    ctx.fillStyle = '#fbf9f5';
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle decorative frame
    ctx.strokeStyle = '#d2c4bd';
    ctx.lineWidth = 4;
    ctx.strokeRect(64, 64, 952, 1792);

    ctx.fillStyle = '#755844';
    ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `OUR KEEPSAKE • ${profile.partner1Name.toUpperCase()} & ${profile.partner2Name.toUpperCase()}`,
      540,
      260
    );

    ctx.fillStyle = '#33251d';
    ctx.font = '600 56px "Playfair Display", Georgia, serif';
    ctx.fillText(memory.title.slice(0, 32), 540, 360);

    ctx.fillStyle = '#755844';
    ctx.font = 'italic 34px "Playfair Display", Georgia, serif';
    ctx.fillText(`${formatStandardDate(memory.dateISO)} • ${memory.location}`, 540, 430);

    // Polaroid card box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(140, 520, 800, 900);
    ctx.strokeStyle = '#e4e2de';
    ctx.lineWidth = 2;
    ctx.strokeRect(140, 520, 800, 900);

    ctx.fillStyle = '#4a3b32';
    ctx.fillRect(180, 560, 720, 700);

    ctx.fillStyle = '#f6ded1';
    ctx.font = 'italic 36px "Playfair Display", Georgia, serif';
    const quoteLines = (memory.quoteHighlight || memory.snippet).match(/.{1,38}(\s|$)/g) || [];
    quoteLines.slice(0, 5).forEach((line, idx) => {
      ctx.fillText(line.trim(), 540, 820 + idx * 54);
    });

    ctx.fillStyle = '#33251d';
    ctx.font = 'italic 34px "Playfair Display", Georgia, serif';
    ctx.fillText(`“${memory.photos[0]?.caption || memory.moodVibe}”`, 540, 1350);

    ctx.fillStyle = '#755844';
    ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Sealed with love • ${memory.signOffAuthor}`, 540, 1680);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `keepsake-lockscreen-${memory.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setLockscreenModalOpen(false);
    onToast('Lockscreen Keepsake Wallpaper downloaded!', 'success');
  };

  const longFormattedDate = formatLongWeekdayDate(memory.dateISO);
  const displayTimeLabel =
    memory.timeFormatted && memory.timeFormatted.toLowerCase() !== 'all day'
      ? memory.timeFormatted
      : 'Whole Day Note';

  // (2026-07-13) Support embeddedInOverlay mode for identical overlay view; was tab only
  return (
    <div
      onTouchStart={
        embeddedInOverlay
          ? undefined
          : (e) => {
              if (e.touches.length === 1) {
                setTouchStartX(e.touches[0].clientX);
                setIsDragging(true);
              }
            }
      }
      onTouchMove={
        embeddedInOverlay
          ? undefined
          : (e) => {
              if (touchStartX !== null && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - touchStartX;
                setDragOffsetX(Math.max(-110, Math.min(110, deltaX * 0.65)));
              }
            }
      }
      onTouchEnd={
        embeddedInOverlay
          ? undefined
          : () => {
              setIsDragging(false);
              if (dragOffsetX < -55 && nextMemory) {
                onSelectMemory(nextMemory.id);
              } else if (dragOffsetX > 55 && prevMemory) {
                onSelectMemory(prevMemory.id);
              }
              setDragOffsetX(0);
              setTouchStartX(null);
            }
      }
      style={
        embeddedInOverlay
          ? undefined
          : {
              transform: isDismissing
                ? 'translateX(100%)'
                : dragOffsetX !== 0
                ? `translateX(${dragOffsetX}px)`
                : undefined,
              transition: isDragging
                ? 'none'
                : 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease',
            }
      }
      className={
        embeddedInOverlay
          ? 'flex flex-col w-full'
          : `flex flex-col w-full px-margin pb-space-xl max-w-[760px] mx-auto will-change-transform ${
              isDismissing ? 'envelope-slide-out' : 'envelope-slide-in'
            }`
      }
    >
      {/* (2026-07-13) Render top bar & swipe hint only when not embedded in overlay */}
      {!embeddedInOverlay && (
        <>
          <div className="w-full flex items-center justify-between mb-3 pt-1 pb-2 no-print gap-2">
            <button
              type="button"
              onClick={handleCloseWithAnimation}
              aria-label="Return to timeline"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high/90 text-primary border border-outline-variant/30 text-[13px] font-medium shadow-sm hover:bg-surface-variant transition-colors active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Timeline</span>
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                disabled={!prevMemory}
                onClick={() => prevMemory && onSelectMemory(prevMemory.id)}
                title={prevMemory ? `Previous: ${prevMemory.title}` : 'No previous date'}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-90 disabled:opacity-35 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="text-[11px] uppercase font-bold tracking-widest text-secondary bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/30 truncate">
                {longFormattedDate}
              </span>
              <button
                type="button"
                disabled={!nextMemory}
                onClick={() => nextMemory && onSelectMemory(nextMemory.id)}
                title={nextMemory ? `Next: ${nextMemory.title}` : 'No next date'}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-90 disabled:opacity-35 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={handleCloseWithAnimation}
                title="Close story"
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-90 ml-0.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-secondary/80 font-medium mb-4 select-none no-print">
            <span className="material-symbols-outlined text-[14px]">swipe</span>
            <span>Swipe left or right to switch dates</span>
          </div>
        </>
      )}

      {/* Centered Romantic Header with Capybara Emblem */}
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
        {/* (2026-07-13) Remove icon left of story header title; was auto_awesome */}
        <h2 className="font-['Playfair_Display',Georgia,serif] tracking-tight text-2xl md:text-3xl text-center text-primary font-semibold">
          <span>{capitalizeFirstLetters(memory.letterHeading || memory.title)}</span>
        </h2>
        {/* (2026-07-13) Update romantic subtitle quote; was Every little moment */}
        <p className="mt-1 max-w-xs leading-relaxed font-['Cormorant_Garamond',serif] italic text-base text-secondary">
          You&apos;re the closest to heaven, that I&apos;ll ever be, baby
        </p>
      </div>

      {/* Context Pills: Date & Location */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 font-['Plus_Jakarta_Sans',sans-serif]">
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
                {longFormattedDate} • {displayTimeLabel}
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
                {memory.location || 'Bogo City, Cebu'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Actions Bar (Link, Edit, Delete) */}
      <div
        id="editorial-reader-actions-toolbar" // Reader actions toolbar for editing and links
        className="flex items-center justify-end gap-1.5 mb-space-md no-print"
      >
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/date/${memory.dateISO}`;
            navigator.clipboard
              .writeText(url)
              .then(() => {
                onToast(`Link copied: /date/${memory.dateISO}`, 'info');
              })
              .catch(() => {
                onToast(`/date/${memory.dateISO}`, 'info');
              });
          }}
          title="Copy direct link for this date"
          className="w-8 h-8 rounded-lg bg-surface-container-low text-secondary hover:text-primary flex items-center justify-center border border-outline-variant/35 shadow-xs active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">link</span>
        </button>
        <button
          type="button"
          onClick={() => onEditMemory(memory)}
          className="px-3.5 py-1.5 rounded-lg bg-surface-container-low text-primary hover:bg-surface-container font-label-md text-xs uppercase tracking-wider flex items-center gap-1.5 border border-outline-variant/35 shadow-xs active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          <span>Edit</span>
        </button>
        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          title="Delete memory"
          className="w-8 h-8 rounded-lg bg-surface-container-low text-error hover:bg-error/10 flex items-center justify-center border border-outline-variant/35 shadow-xs active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {/* (2026-07-13) Refine parchment card typography & proportions; was oversized */}
      <article className="relative bg-surface-container-lowest rounded-2xl shadow-sm p-5 sm:p-6 mb-space-lg overflow-hidden border border-outline-variant/30">
        {/* (2026-07-13) Remove icon left of card title & size 2-line drop cap; was 30px */}
        <header className="mb-4">
          <h1 className="font-['Playfair_Display',Georgia,serif] text-lg sm:text-xl font-semibold text-primary tracking-tight leading-snug">
            {capitalizeFirstLetters(memory.letterHeading || memory.title)}
          </h1>
          <div className="w-10 h-0.5 bg-secondary-container mt-2.5 rounded-full" />
        </header>

        <div className="relative z-10 text-on-surface-variant">
          <p className="font-['Plus_Jakarta_Sans',Roboto,sans-serif] text-[14px] sm:text-[15px] text-on-surface/95 leading-[1.65] text-left mb-4 whitespace-pre-line">
            <span className="float-left font-['Playfair_Display',Georgia,serif] text-[44px] sm:text-[48px] leading-[0.82] font-semibold text-secondary pr-2 pt-[3px]">
              {dropCapChar}
            </span>
            {firstParaRest}
          </p>

          {memory.quoteHighlight && (
            <div className="px-4 py-3.5 bg-surface-container-low/65 rounded-xl my-4 border border-outline-variant/25">
              {/* (2026-07-13) Increase quote font size; was text-[15px] sm:text-base */}
              <p className="font-['Cormorant_Garamond',Georgia,serif] text-lg sm:text-xl font-medium text-secondary text-center italic leading-relaxed">
                “{memory.quoteHighlight}”
              </p>
            </div>
          )}

          {remainingParas.map((para, i) => (
            <p
              key={i}
              className="font-['Plus_Jakarta_Sans',Roboto,sans-serif] text-[14px] sm:text-[15px] text-on-surface/90 leading-[1.7] text-left mb-3 whitespace-pre-line"
            >
              {para}
            </p>
          ))}

          {/* Handwritten Sign-off with nested sleeping capybara watermark */}
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
              {memory.signOffAuthor || `${profile.partner1Name} • St. 14`}
            </span>
          </div>
        </div>
      </article>

      {/* Interactive Media Section Header */}
      <div className="flex items-center justify-between mb-space-sm px-1 flex-wrap gap-2">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[18px] text-secondary">attachment</span>
          <h2 className="font-headline-sm text-headline-sm text-primary tracking-tight font-serif">
            Keepsake Vault Elements
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onEditMemory(memory)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary uppercase tracking-wider bg-secondary-container/60 hover:bg-secondary-container px-2.5 py-1 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">edit</span>
          <span>Edit Elements</span>
        </button>
      </div>

      {/* (2026-07-13) Add quick media add buttons & only render audio if URL exists */}
      <div className="flex flex-wrap items-center gap-2 mb-space-md">
        <button
          type="button"
          onClick={() => onEditMemory(memory)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-primary font-label-md text-label-md uppercase tracking-wider transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
          <span>+ Photos</span>
        </button>
        <button
          type="button"
          onClick={() => onEditMemory(memory)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-primary font-label-md text-label-md uppercase tracking-wider transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">mic</span>
          <span>+ Voice Memo</span>
        </button>
        <button
          type="button"
          onClick={() => onEditMemory(memory)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-primary font-label-md text-label-md uppercase tracking-wider transition-colors shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">videocam</span>
          <span>+ Video</span>
        </button>
      </div>

      {/* (2026-07-13) Filter mock audio URL in story reader; was showing fake VM */}
      {(!memory.photos.length && (!memory.audioMemo || !memory.audioMemo.url || memory.audioMemo.url.startsWith('mock-')) && (!memory.videoCapsule || !memory.videoCapsule.url)) && (
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-dashed border-outline-variant/40 text-center flex flex-col items-center gap-2 mb-space-md">
          <span className="material-symbols-outlined text-[28px] text-outline">perm_media</span>
          <p className="font-headline-sm text-headline-sm text-primary font-serif">
            No Media Attached Yet
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
            Add polaroid photos, whispered voice notes, or candid video capsules to this date.
          </p>
          <button
            type="button"
            onClick={() => onEditMemory(memory)}
            className="mt-1 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider font-semibold shadow-xs hover:opacity-90 transition-opacity"
          >
            Add Media &amp; Edit
          </button>
        </div>
      )}

      {/* Luxury Voicenote Audio Player Card */}
      {memory.audioMemo && memory.audioMemo.url && !memory.audioMemo.url.startsWith('mock-') && (
        <div className="bg-primary-container text-on-primary rounded-xl p-space-md shadow-md mb-space-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-space-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-[18px] text-tertiary-fixed-dim"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mic
              </span>
              <span className="font-label-md text-label-md uppercase tracking-wider text-on-primary-container">
                Our Voicenote from that Night
              </span>
            </div>
            <span className="font-label-md text-label-md text-tertiary-fixed-dim px-2 py-0.5 rounded-full bg-surface-dim/20">
              WAV • Mastered
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-surface-container-lowest font-medium mb-3 italic">
            “{memory.audioMemo.title}”
          </p>

          <div className="bg-on-primary-fixed-variant/40 rounded-lg p-space-sm flex flex-col gap-2">
            {/* Interactive Waveform Bars */}
            <div className="flex items-center justify-between h-9 px-1 gap-1">
              {memory.audioMemo.waveformPeaks.map((peak, idx) => {
                const totalBars = memory.audioMemo!.waveformPeaks.length;
                const progressRatio = isPlayingAudio
                  ? audioState.currentTime / Math.max(1, audioState.duration)
                  : 0.55;
                const isFilled = idx / totalBars <= progressRatio;
                return (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Seek to ${Math.round((idx / totalBars) * 100)}%`}
                    onClick={() => {
                      if (!isPlayingAudio) {
                        audioEngine.toggleTrack(
                          memory.audioMemo!.id,
                          memory.audioMemo!.durationSeconds,
                          memory.audioMemo!.url,
                          memory.audioMemo!.synthNotes
                        );
                      }
                      audioEngine.seek((idx / totalBars) * memory.audioMemo!.durationSeconds);
                    }}
                    style={{ height: `${Math.max(22, peak)}%` }}
                    className={`w-1.5 rounded-full transition-all ${
                      isFilled ? 'bg-tertiary-fixed' : 'bg-on-primary-container/40'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-space-sm">
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
                  aria-label="Play audio memory"
                  className="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-md active:scale-95 transition-transform"
                >
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {isPlayingAudio ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-surface-bright tracking-wider">
                    {isPlayingAudio ? formatDuration(audioState.currentTime) : '00:48'}{' '}
                    <span className="text-on-primary-container font-normal">
                      / {memory.audioMemo.durationFormatted}
                    </span>
                  </span>
                  <span className="font-body-sm text-[10px] text-on-primary-container leading-none">
                    128 kbps • Stereo Ambient
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pr-1">
                <span className="material-symbols-outlined text-[18px] text-on-primary-container">
                  volume_up
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioState.volume}
                  onChange={(e) => audioEngine.setVolume(parseFloat(e.target.value))}
                  className="w-16 h-1.5 accent-tertiary-fixed cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Polaroid Film Strips Section */}
      {memory.photos.length > 0 && (
        <div className="mb-space-lg">
          <div className="flex items-center justify-between mb-space-sm px-1">
            <span className="font-label-md text-label-md uppercase tracking-wider text-secondary font-semibold">
              Instant Film Strips
            </span>
            <span className="font-label-md text-label-md text-outline">
              Fujifilm FP-100C • {memory.photos.length}{' '}
              {memory.photos.length === 1 ? 'Frame' : 'Frames'}
            </span>
          </div>
          <div className="relative py-2 px-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {memory.photos.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => setLightboxPhoto(photo)}
                className={`relative bg-surface-container-lowest p-3 pb-4 rounded shadow-md transform transition-transform duration-300 cursor-pointer border border-outline-variant/20 ${
                  idx % 2 === 0 ? '-rotate-1 hover:rotate-0' : 'rotate-2 hover:rotate-0'
                }`}
              >
                {idx % 2 === 0 ? (
                  <div className="absolute -top-2 left-6 w-3 h-3 rounded-full bg-tertiary-fixed-dim shadow-xs flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-tertiary" />
                  </div>
                ) : (
                  <div className="absolute -top-2 right-8 w-14 h-4 bg-secondary-fixed/70 backdrop-blur-sm rounded-xs rotate-3 shadow-xs" />
                )}
                <div className="aspect-square w-full rounded-sm overflow-hidden bg-surface-container mb-3 shadow-inner">
                  <img
                    className="w-full h-full object-cover"
                    alt={photo.caption}
                    src={photo.url}
                  />
                </div>
                <p className="font-italic-quote text-body-sm text-secondary text-center italic tracking-wide font-serif">
                  “{photo.caption}”
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Firestore Video Capsule Card */}
      {memory.videoCapsule && (
        <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm mb-space-lg border border-outline-variant/25">
          <div className="flex items-center justify-between mb-space-xs">
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-[16px]">videocam</span>
              <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
                Video Capsule
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-md text-label-md">
              <span className="material-symbols-outlined text-[12px] text-secondary">
                cloud_done
              </span>
              <span>Cloud Archive • {memory.videoCapsule.resolution || '1080p HD'}</span>
            </div>
          </div>

          <div
            onClick={() => setVideoPlaying((p) => !p)}
            className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface-container shadow-sm group cursor-pointer"
          >
            {videoPlaying && memory.videoCapsule.url ? (
              <video
                src={memory.videoCapsule.url}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <img
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    videoPlaying ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                  alt={memory.videoCapsule.title}
                  src={memory.videoCapsule.thumbnailUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-black/20 flex flex-col justify-between p-space-sm">
                  <div className="flex justify-between items-center">
                    {videoPlaying ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-[10px] uppercase tracking-wider animate-pulse">
                        Playing Reel Preview...
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="px-2 py-0.5 rounded bg-primary/70 backdrop-blur-md text-surface-bright font-label-md text-[10px] uppercase tracking-wider">
                      {memory.videoCapsule.durationFormatted}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      aria-label="Play video memory"
                      className="w-12 h-12 rounded-full bg-surface-bright/90 text-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 active:scale-95 transition-all"
                    >
                      <span
                        className="material-symbols-outlined text-[28px] ml-0.5"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {videoPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                  </div>
                  <div className="text-surface-bright">
                    <p className="font-body-sm text-body-sm font-medium tracking-tight flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">
                        movie
                      </span>
                      {memory.videoCapsule.title}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Partner Replies & Secret Margin Notes */}
      {memory.partnerNotes.length > 0 && (
        <div className="mb-space-lg flex flex-col gap-2.5">
          <span className="font-label-md text-label-md uppercase tracking-wider text-secondary px-1">
            Handwritten Margin Notes ({memory.partnerNotes.length})
          </span>
          {memory.partnerNotes.map((note) => (
            <div
              key={note.id}
              className="bg-secondary-container/35 rounded-xl p-3.5 border border-outline-variant/30 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between text-secondary font-label-md text-[10px] uppercase tracking-wider">
                <span>From {note.author}</span>
                <span>{formatStandardDate(note.createdAt)}</span>
              </div>
              <p className="font-body-md text-body-md text-primary font-serif italic">
                “{note.text}”
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Affirmation & Bottom Actions Section */}
      <div className="flex flex-col gap-space-sm pt-space-xs no-print">
        <button
          type="button"
          onClick={() => setNoteDrawerOpen(true)}
          className="w-full py-3.5 px-space-md rounded-xl bg-primary text-on-primary font-label-lg text-label-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:bg-primary-container active:scale-[0.99] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">edit_note</span>
          <span>Leave a Note for {profile.partner2Name}</span>
        </button>

        <div className="grid grid-cols-2 gap-space-sm">
          <button
            type="button"
            onClick={() => {
              onToast('Preparing stationery print / PDF layout...', 'info');
              setTimeout(() => window.print(), 250);
            }}
            className="py-3 px-space-sm rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs hover:bg-surface-container transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">
              picture_as_pdf
            </span>
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setLockscreenModalOpen(true)}
            className="py-3 px-space-sm rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs hover:bg-surface-container transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">wallpaper</span>
            <span>Set Lockscreen</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-space-sm pt-space-xs text-on-surface-variant/70">
          <span
            className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          <span className="font-label-md text-label-md tracking-wider">
            Archived in {profile.partner1Name} &amp; {profile.partner2Name}&apos;s Keepsake Ledger
          </span>
        </div>
      </div>

      {/* (2026-07-13) Portal modals at z-150 for overlay compatibility & Save Note */}
      {noteDrawerOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setNoteDrawerOpen(false)}
          >
            <form
              onSubmit={handleSavePartnerNote}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
                <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                  Leave a Margin Note for {profile.partner2Name}
                </h3>
                <button
                  type="button"
                  onClick={() => setNoteDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div>
                <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                  Signed By
                </label>
                <input
                  type="text"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
                />
              </div>
              <div>
                <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                  Your Whispered Note
                </label>
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={`Write something sweet for ${profile.partner2Name} to discover on this page...`}
                  className="w-full p-3 rounded-lg bg-surface-container-low text-primary font-body-md text-body-md border border-outline-variant/40 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNoteDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container-low text-secondary font-label-md text-label-md uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase shadow-md"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Polaroid Lightbox Modal */}
      {lightboxPhoto &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface-container-lowest p-4 pb-6 rounded-xl shadow-2xl modal-animate-in flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                  {lightboxPhoto.tag || 'INSTANT FILM'} • {formatStandardDate(memory.dateISO)}
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="w-full aspect-square rounded overflow-hidden bg-surface-container">
                <img
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.caption}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="font-italic-quote text-italic-quote text-primary text-center italic font-serif">
                “{lightboxPhoto.caption}”
              </p>
            </div>
          </div>,
          document.body
        )}

      {/* Lockscreen Generator Modal */}
      {lockscreenModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLockscreenModalOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col items-center text-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">wallpaper</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                Keepsake Lockscreen Card
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Generate a custom 1080×1920 stationery lockscreen wallpaper featuring this date,
                quote, and polaroid caption for you and {profile.partner2Name}.
              </p>
              <div className="w-48 aspect-[9/16] rounded-xl bg-surface-container-low border-2 border-outline-variant/50 p-3 flex flex-col justify-between shadow-inner">
                <span className="font-label-md text-[9px] uppercase tracking-widest text-secondary">
                  {formatStandardDate(memory.dateISO)}
                </span>
                {memory.photos[0] && (
                  <img
                    src={memory.photos[0].url}
                    alt={memory.title}
                    className="w-full h-28 object-cover rounded"
                  />
                )}
                <p className="font-serif italic text-[11px] text-primary clamp-3">
                  “{memory.quoteHighlight || memory.snippet}”
                </p>
                <span className="font-label-md text-[8px] uppercase text-outline">
                  {profile.partner1Name} &amp; {profile.partner2Name}
                </span>
              </div>
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={() => setLockscreenModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-secondary font-label-md text-label-md uppercase"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDownloadLockscreenWallpaper}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase shadow-md"
                >
                  Download PNG
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal (No Native Confirm per SKILL.md) */}
      {deleteConfirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-4 text-center"
            >
              <div className="w-11 h-11 mx-auto rounded-full bg-error-container text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                Remove This Keepsake?
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Are you sure you want to remove &ldquo;{memory.title}&rdquo; from your shared archive?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-secondary font-label-md text-label-md uppercase"
                >
                  Keep Memory
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    onDeleteMemory(memory.id);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md uppercase shadow-md"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
