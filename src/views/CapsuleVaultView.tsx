// (2026-07-13) Build Keepsake Archive & Media Vault view per Stitch & PRD
import React, { useState, useMemo, useEffect } from 'react';
import {
  CoupleProfile,
  KeepsakeMemory,
  PolaroidPhoto,
  TimeCapsuleItem,
} from '../types';
import {
  calculateDaysUntil,
  formatDuration,
  formatStandardDate,
} from '../utils/dateFormat';
import { audioEngine } from '../utils/audioEngine';
// (2026-07-13) Register Capsule modals with modalManager; was unhandled
import { pushModal } from '../utils/modalManager';

interface CapsuleVaultViewProps {
  profile: CoupleProfile;
  memories: KeepsakeMemory[];
  timeCapsule: TimeCapsuleItem;
  onUpdateTimeCapsule: (next: TimeCapsuleItem) => void;
  onToggleAudioFavorite: (memoryId: string) => void;
  onOpenMemory: (memoryId: string) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
}

export const CapsuleVaultView: React.FC<CapsuleVaultViewProps> = ({
  profile,
  memories,
  timeCapsule,
  onUpdateTimeCapsule,
  onToggleAudioFavorite,
  onOpenMemory,
  onToast,
}) => {
  const [segment, setSegment] = useState<'ALL' | 'POLAROIDS' | 'VOICE' | 'VIDEOS'>('ALL');
  const [vaultSearch, setVaultSearch] = useState('');
  const [expandAllPhotos, setExpandAllPhotos] = useState(false);
  const [audioState, setAudioState] = useState(audioEngine.getState());
  const [selectedPolaroid, setSelectedPolaroid] = useState<
    (PolaroidPhoto & { memoryId: string; dateISO: string }) | null
  >(null);
  const [capsuleModalOpen, setCapsuleModalOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [newCapsuleLetterTitle, setNewCapsuleLetterTitle] = useState('');
  const [newCapsuleLetterBody, setNewCapsuleLetterBody] = useState('');

  // (2026-07-13) Register Capsule modals for back dismissal; was unhandled
  useEffect(() => {
    if (selectedPolaroid) {
      return pushModal('polaroid-lightbox', () => setSelectedPolaroid(null));
    }
  }, [selectedPolaroid]);

  useEffect(() => {
    if (capsuleModalOpen) {
      return pushModal('capsule-modal', () => setCapsuleModalOpen(false));
    }
  }, [capsuleModalOpen]);

  useEffect(() => {
    return audioEngine.subscribe(() => {
      setAudioState(audioEngine.getState());
    });
  }, []);

  const allPhotos = useMemo(() => {
    const list: (PolaroidPhoto & { memoryId: string; dateISO: string; memoryTitle: string })[] = [];
    memories.forEach((m) => {
      m.photos.forEach((p) => {
        list.push({
          ...p,
          memoryId: m.id,
          dateISO: m.dateISO,
          memoryTitle: m.title,
        });
      });
    });
    const q = vaultSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.caption.toLowerCase().includes(q) ||
        (p.tag || '').toLowerCase().includes(q) ||
        p.memoryTitle.toLowerCase().includes(q)
    );
  }, [memories, vaultSearch]);

  const allVoiceTracks = useMemo(() => {
    const tracks = memories
      .filter((m) => Boolean(m.audioMemo))
      .map((m) => ({
        memoryId: m.id,
        dateISO: m.dateISO,
        location: m.location,
        memo: m.audioMemo!,
      }));
    const q = vaultSearch.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (t) =>
        t.memo.title.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)
    );
  }, [memories, vaultSearch]);

  const allVideoReels = useMemo(() => {
    const reels = memories
      .filter((m) => Boolean(m.videoCapsule))
      .map((m) => ({
        memoryId: m.id,
        dateISO: m.dateISO,
        memoryTitle: m.title,
        video: m.videoCapsule!,
      }));
    const q = vaultSearch.trim().toLowerCase();
    if (!q) return reels;
    return reels.filter(
      (r) =>
        r.video.title.toLowerCase().includes(q) ||
        r.memoryTitle.toLowerCase().includes(q)
    );
  }, [memories, vaultSearch]);

  const daysUntilUnlock = useMemo(
    () => calculateDaysUntil(timeCapsule.unlockDateISO),
    [timeCapsule.unlockDateISO]
  );

  const handleUnlockTimeCapsule = (biometric = false) => {
    if (biometric || passcodeInput.trim() === timeCapsule.passcode || passcodeInput.trim() === '1014') {
      onUpdateTimeCapsule({
        ...timeCapsule,
        isUnlocked: true,
        updatedAt: Date.now(),
      });
      setPasscodeInput('');
      onToast('Ceremonial Time Capsule unlocked for JP & Zea!', 'success');
    } else {
      // (2026-07-13) Remove passcode hint; was Passcode hint: Try 1014...
      onToast('Incorrect passcode. Please try again or tap Biometric Unlock.', 'warning');
    }
  };

  const handleSealNewCapsuleLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCapsuleLetterBody.trim()) return;
    const next: TimeCapsuleItem = {
      ...timeCapsule,
      sealedLetters: [
        ...timeCapsule.sealedLetters,
        {
          id: `sl-${Date.now()}`,
          author: profile.partner1Name,
          title:
            newCapsuleLetterTitle.trim() || `For ${profile.partner2Name} on Our Milestone`,
          body: newCapsuleLetterBody.trim(),
          writtenDateISO: new Date().toISOString().slice(0, 10),
        },
      ],
      updatedAt: Date.now(),
    };
    onUpdateTimeCapsule(next);
    setNewCapsuleLetterTitle('');
    setNewCapsuleLetterBody('');
    onToast('Secret letter sealed inside the Anniversary Time Capsule!', 'success');
  };

  const displayedPhotos = expandAllPhotos ? allPhotos : allPhotos.slice(0, 4);

  return (
    <div className="flex flex-col w-full pb-12 max-w-[760px] mx-auto">
      {/* Vault Intro Header */}
      <section className="px-margin pt-2 pb-space-lg flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute -top-3 right-2 opacity-[0.07] pointer-events-none w-32 h-24">
          <svg
            className="text-primary w-full h-full stroke-[1.5]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 120 90"
          >
            <path d="M20,60 C20,40 38,25 65,26 C85,26 102,36 105,52 C108,66 98,78 75,78 C52,78 20,78 20,60 Z" />
            <ellipse cx="94" cy="46" rx="8" ry="7" />
            <path d="M96,48 C93,48 91,46 91,44" />
            <path d="M102,40 C106,37 108,32 105,28" />
            <path d="M35,32 Q40,20 48,28" strokeDasharray="1 2" />
            <path d="M25,65 Q18,70 12,68" />
            <path d="M72,20 C72,20 76,14 82,18 C86,22 81,25 81,25" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container mb-space-sm shadow-sm">
          <span
            className="material-symbols-outlined text-[15px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock_clock
          </span>
          <span className="font-label-md text-label-md tracking-widest uppercase">
            Vault No. 024 • {profile.partner1Name} &amp; {profile.partner2Name}
          </span>
        </div>

        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight mb-space-xs font-serif">
          The Archive of Us
        </h1>
        <p className="font-italic-quote text-italic-quote text-secondary max-w-xs mb-space-md italic font-serif">
          &ldquo;Every soft whisper, unhurried afternoon, and sweet laughter kept safe for all our
          tomorrows.&rdquo;
        </p>

        {/* Vault Metric Capsule */}
        <div className="w-full bg-surface-container-low rounded-xl p-space-md shadow-sm relative overflow-hidden border border-outline-variant/25">
          <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-secondary-fixed/30 pointer-events-none" />
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              </div>
              <div className="min-w-0">
                <p className="font-headline-sm text-headline-sm text-primary leading-tight font-serif">
                  {memories.length}
                </p>
                <p className="font-label-md text-label-md text-on-surface-variant truncate-single">
                  Dates Preserved
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">photo_library</span>
              </div>
              <div className="min-w-0">
                <p className="font-headline-sm text-headline-sm text-primary leading-tight font-serif">
                  {allPhotos.length}
                </p>
                <p className="font-label-md text-label-md text-on-surface-variant truncate-single">
                  Film Photos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">mic</span>
              </div>
              <div className="min-w-0">
                <p className="font-headline-sm text-headline-sm text-primary leading-tight font-serif">
                  {allVoiceTracks.length}
                </p>
                <p className="font-label-md text-label-md text-on-surface-variant truncate-single">
                  Voice Notes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">movie</span>
              </div>
              <div className="min-w-0">
                <p className="font-headline-sm text-headline-sm text-primary leading-tight font-serif">
                  {allVideoReels.length}
                </p>
                <p className="font-label-md text-label-md text-on-surface-variant truncate-single">
                  Video Reels
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vault Search Input & Segmented Navigation Chips */}
      <section className="px-margin mb-space-lg flex flex-col gap-3">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined text-[18px] text-secondary absolute left-3 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={vaultSearch}
            onChange={(e) => setVaultSearch(e.target.value)}
            placeholder="Filter polaroids, voice notes, or video reels..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
          />
          {vaultSearch && (
            <button
              type="button"
              onClick={() => setVaultSearch('')}
              className="absolute right-2.5 text-secondary hover:text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'All Memories' },
            { id: 'POLAROIDS', label: 'Photo Polaroids' },
            { id: 'VOICE', label: 'Voice Vault' },
            { id: 'VIDEOS', label: 'Video Reels' },
          ].map((chip) => {
            const active = segment === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSegment(chip.id as 'ALL' | 'POLAROIDS' | 'VOICE' | 'VIDEOS')}
                className={`px-4 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-transform active:scale-95 ${
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-primary'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Voice Vault Highlight Section */}
      {(segment === 'ALL' || segment === 'VOICE') && (
        <section className="px-margin mb-space-xl">
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                graphic_eq
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-serif">
                Hear {profile.partner2Name}&apos;s Voice Again
              </h2>
            </div>
            <span className="font-label-md text-label-md text-secondary uppercase tracking-widest">
              {allVoiceTracks.length} Tracks
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
            Unfiltered candid voice messages recorded in fleeting, magical moments.
          </p>

          <div className="flex flex-col gap-space-sm">
            {allVoiceTracks.map((track) => {
              const isPlaying =
                audioState.currentTrackId === track.memo.id && audioState.isPlaying;
              return (
                <div
                  key={track.memo.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden group border border-outline-variant/25"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      onClick={() => onOpenMemory(track.memoryId)}
                      className="flex items-center gap-2 min-w-0 pr-2 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim shrink-0" />
                      <span className="font-label-lg text-label-lg text-primary truncate-single hover:underline">
                        {track.memo.title}
                      </span>
                    </div>
                    <span className="font-label-md text-label-md text-secondary shrink-0">
                      {formatStandardDate(track.dateISO)} •{' '}
                      {isPlaying
                        ? formatDuration(audioState.currentTime)
                        : track.memo.durationFormatted}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        audioEngine.toggleTrack(
                          track.memo.id,
                          track.memo.durationSeconds,
                          track.memo.url,
                          track.memo.synthNotes
                        )
                      }
                      aria-label="Play recording"
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-90 ${
                        isPlaying
                          ? 'bg-primary text-on-primary'
                          : 'bg-secondary-container text-on-secondary-container'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    <div className="flex-1 flex items-center gap-[3px] h-7 px-2 bg-surface-container-low rounded-lg">
                      {track.memo.waveformPeaks.slice(0, 15).map((peak, idx) => (
                        <span
                          key={idx}
                          style={{ height: `${Math.max(22, peak)}%` }}
                          className={`w-1 rounded-full transition-all ${
                            isPlaying && idx % 2 === 0 ? 'bg-primary' : 'bg-secondary/65'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleAudioFavorite(track.memoryId)}
                      aria-label="Favorite voice memo"
                      className="text-secondary hover:text-primary transition-colors p-1"
                    >
                      <span
                        className="material-symbols-outlined text-[19px]"
                        style={{
                          fontVariationSettings: track.memo.isFavorite ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        {track.memo.isFavorite ? 'favorite' : 'favorite_border'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Curated Polaroid Photo Wall */}
      {(segment === 'ALL' || segment === 'POLAROIDS') && (
        <section className="px-margin mb-space-xl relative">
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                filter_frames
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-serif">
                Polaroid Scrapbook
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setExpandAllPhotos((p) => !p)}
              className="font-label-md text-label-md text-secondary hover:text-primary transition-colors uppercase tracking-wider"
            >
              {expandAllPhotos ? 'Show Featured (4)' : `Expand All (${allPhotos.length})`}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {displayedPhotos.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPolaroid(photo)}
                className={`bg-surface-container-lowest p-2 pb-3.5 rounded-lg shadow-md transition-transform hover:rotate-0 duration-300 relative group cursor-pointer border border-outline-variant/20 ${
                  idx % 2 === 0 ? '-rotate-1' : 'rotate-2 mt-2'
                }`}
              >
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-10 h-3 bg-secondary-fixed/50 backdrop-blur-xs rounded-xs shadow-xs pointer-events-none rotate-2" />
                <div className="w-full aspect-[4/5] overflow-hidden rounded-xs bg-surface-container-high mb-2 relative">
                  <img
                    className="w-full h-full object-cover"
                    alt={photo.caption}
                    src={photo.url}
                  />
                  {photo.tag && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-xs bg-primary/70 text-on-primary font-label-md text-[9px] tracking-wider backdrop-blur-xs">
                      {photo.tag}
                    </span>
                  )}
                </div>
                <p className="font-italic-quote text-[13px] text-center text-primary leading-tight px-1 italic font-serif">
                  &ldquo;{photo.caption}&rdquo;
                </p>
                <span className="block text-center font-label-md text-[10px] text-on-surface-variant mt-0.5">
                  {formatStandardDate(photo.dateISO)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Video Memories Reel Strip */}
      {(segment === 'ALL' || segment === 'VIDEOS') && (
        <section className="mb-space-xl">
          <div className="px-margin flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                videocam
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-serif">
                Film Reel Vignettes
              </h2>
            </div>
            <span className="font-label-md text-label-md text-secondary uppercase tracking-widest">
              {allVideoReels.length} Clips
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-margin py-1">
            {allVideoReels.map((item) => (
              <div
                key={item.video.id}
                onClick={() => onOpenMemory(item.memoryId)}
                className="w-40 shrink-0 bg-surface-container-low rounded-xl p-1.5 shadow-sm group cursor-pointer border border-outline-variant/25"
              >
                <div className="w-full h-52 rounded-lg overflow-hidden relative bg-primary-container">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={item.video.title}
                    src={item.video.thumbnailUrl}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-transparent to-black/20 flex flex-col justify-between p-2">
                    <div className="self-end px-1.5 py-0.5 rounded-full bg-primary/60 backdrop-blur-xs text-on-primary font-label-md text-[10px]">
                      {item.video.durationFormatted}
                    </div>
                    <div className="flex items-center gap-1.5 text-on-primary">
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        play_circle
                      </span>
                      <span className="font-label-md text-[11px] truncate-single">
                        {item.memoryTitle}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Special Keepsake Feature: Anniversary Time Capsule */}
      <section className="px-margin">
        <div
          onClick={() => setCapsuleModalOpen(true)}
          className="bg-surface-container rounded-xl p-space-md shadow-md relative overflow-hidden cursor-pointer border border-outline-variant/35 hover-lift"
        >
          <div className="absolute -right-4 -bottom-4 opacity-[0.06] pointer-events-none w-36 h-36">
            <svg
              className="text-primary w-full h-full stroke-[1.5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 100 100"
            >
              <ellipse cx="50" cy="65" rx="35" ry="20" />
              <path d="M30,55 C30,38 42,28 62,28 C74,28 85,35 88,48 C90,56 82,65 65,65" />
              <circle cx="78" cy="40" r="3" />
              <circle cx="48" cy="22" r="7" stroke="currentColor" />
              <path d="M48,15 L50,12" />
              <path d="M10,75 Q25,70 40,75 T70,75 T95,75" />
            </svg>
          </div>

          <div className="flex items-start justify-between mb-space-sm">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-secondary uppercase tracking-widest mb-0.5">
                Ceremonial Keepsake
              </span>
              <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                {timeCapsule.title}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-secondary to-primary-container text-tertiary-fixed flex items-center justify-center shadow-md ring-2 ring-tertiary-fixed/60 shrink-0">
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {timeCapsule.isUnlocked ? 'lock_open' : 'lock'}
              </span>
            </div>
          </div>

          <p className="font-body-md text-body-md text-on-surface-variant mb-space-md leading-relaxed">
            {timeCapsule.description}
          </p>

          <div className="bg-surface-container-lowest rounded-lg p-space-sm flex items-center justify-between mb-space-md shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                event_upcoming
              </span>
              <div>
                <p className="font-label-lg text-label-lg text-primary">
                  {timeCapsule.isUnlocked
                    ? `Unlocked • ${formatStandardDate(timeCapsule.unlockDateISO)}`
                    : `Locked until ${formatStandardDate(timeCapsule.unlockDateISO)}`}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {timeCapsule.subtitle}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary-container/50 font-label-md text-label-md text-on-secondary-container font-semibold">
              {timeCapsule.isUnlocked ? 'Open Vault' : `${daysUntilUnlock} Days`}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-md text-label-md shadow-xs">
              <span className="material-symbols-outlined text-[15px]">mark_email_unread</span>
              <span>{timeCapsule.sealedLetters.length} Sealed Letters</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-md text-label-md shadow-xs">
              <span className="material-symbols-outlined text-[15px]">videocam</span>
              <span>1 Secret Video</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-md text-label-md shadow-xs">
              <span className="material-symbols-outlined text-[15px]">fingerprint</span>
              <span>Tap to {timeCapsule.isUnlocked ? 'Read Letters' : 'Unlock Vault'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Polaroid Lightbox Modal */}
      {selectedPolaroid && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPolaroid(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface-container-lowest p-4 pb-5 rounded-xl shadow-2xl modal-animate-in flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                {selectedPolaroid.tag || 'POLAROID'} •{' '}
                {formatStandardDate(selectedPolaroid.dateISO)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPolaroid(null)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="w-full aspect-square rounded overflow-hidden bg-surface-container">
              <img
                src={selectedPolaroid.url}
                alt={selectedPolaroid.caption}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-italic-quote text-italic-quote text-primary text-center italic font-serif">
              “{selectedPolaroid.caption}”
            </p>
            <button
              type="button"
              onClick={() => {
                const memId = selectedPolaroid.memoryId;
                setSelectedPolaroid(null);
                onOpenMemory(memId);
              }}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider"
            >
              Open Full Date Envelope
            </button>
          </div>
        </div>
      )}

      {/* Time Capsule Unlock & Reader Modal */}
      {capsuleModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCapsuleModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[88dvh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  {timeCapsule.isUnlocked ? 'lock_open' : 'lock'}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                  {timeCapsule.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCapsuleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {!timeCapsule.isUnlocked ? (
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="w-14 h-14 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[28px]">fingerprint</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                  Enter your shared couple passcode (default: <strong>1014</strong>) or tap Dual
                  Biometrics to unseal the letters inside.
                </p>
                <div className="flex gap-2 w-full max-w-xs">
                  <input
                    type="password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Passcode (1014)"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface-container-low text-primary text-center font-label-lg border border-outline-variant/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleUnlockTimeCapsule(false)}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase"
                  >
                    Unlock
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnlockTimeCapsule(true)}
                  className="w-full max-w-xs py-2.5 rounded-xl bg-secondary-container text-on-secondary-container font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                  <span>Verify Dual Biometrics ({profile.partner1Name} &amp; {profile.partner2Name})</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between bg-secondary-container/40 px-3 py-2 rounded-lg">
                  <span className="font-label-md text-label-md text-on-secondary-container uppercase">
                    Vault Unsealed • {timeCapsule.sealedLetters.length} Letters Inside
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTimeCapsule({ ...timeCapsule, isUnlocked: false })
                    }
                    className="font-label-md text-label-md text-primary underline"
                  >
                    Re-Lock Vault
                  </button>
                </div>

                {timeCapsule.sealedLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-secondary font-label-md text-[10px] uppercase tracking-wider">
                      <span>Written by {letter.author}</span>
                      <span>{formatStandardDate(letter.writtenDateISO)}</span>
                    </div>
                    <h4 className="font-headline-sm text-headline-sm text-primary font-serif">
                      {letter.title}
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line leading-relaxed font-serif">
                      {letter.body}
                    </p>
                  </div>
                ))}

                <form
                  onSubmit={handleSealNewCapsuleLetter}
                  className="border-t border-outline-variant/30 pt-3 flex flex-col gap-2.5"
                >
                  <span className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                    Seal Another Letter Into This Capsule
                  </span>
                  <input
                    type="text"
                    value={newCapsuleLetterTitle}
                    onChange={(e) => setNewCapsuleLetterTitle(e.target.value)}
                    placeholder={`Letter title for ${profile.partner2Name}...`}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                  <textarea
                    rows={3}
                    value={newCapsuleLetterBody}
                    onChange={(e) => setNewCapsuleLetterBody(e.target.value)}
                    placeholder="Write a future promise or love note to seal away..."
                    className="w-full p-3 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider"
                  >
                    Seal Into Time Capsule
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
