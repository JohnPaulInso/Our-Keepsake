// (2026-07-13) Build New Date Memory Composer view per Stitch & SKILL.md
import React, { useState, useRef, useEffect, useMemo } from 'react';
// (2026-07-13) Import createPortal for modal stacking; was trapped in main
import { createPortal } from 'react-dom';
import {
  CoupleProfile,
  DotIndicator,
  KeepsakeMemory,
  MemoryCategory,
  PolaroidPhoto,
} from '../types';
// (2026-07-13) Import capitalizeFirstLetters & getTodayISO; was without capitalize
import { capitalizeFirstLetters, formatDuration, formatStandardDate, getChapterNumber, getTodayISO } from '../utils/dateFormat';
import { audioEngine } from '../utils/audioEngine';
import { ImageCropperModal } from '../components/ImageCropperModal';

interface ComposerViewProps {
  profile: CoupleProfile;
  editingMemory: KeepsakeMemory | null;
  totalMemoriesCount: number;
  onSaveMemory: (memory: KeepsakeMemory, isDraft: boolean) => void;
  onCancel: () => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
  // (2026-07-13) Add onDirtyChange prop for unsaved changes guard; was absent
  onDirtyChange?: (isDirty: boolean) => void;
  existingMemories?: KeepsakeMemory[];
}

const DEFAULT_VIBE_TAGS = [
  'First Time',
  'Cozy Rainy Day',
  'Deep Talks',
  'Anniversary',
  'Roadtrip',
  'Laughter',
  'Sweet Treats',
  'Stargazing',
];

const DEFAULT_POLAROIDS: PolaroidPhoto[] = [
  {
    id: 'ph-comp-1',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAOXzQOGwF2CYKNFaR-QjMcV7FAGBilFMfYTZL6sNFldieolONPGdIEb6x9r-B87hEIGpsRqcMkYU5hj8wiyqwAzIYeRy1uCBdMy5WERUGwbbIwkLSrA8L0Qd5O81Hj5QVbbGxWoGinksP9WGjzAZI_QtxVx_0YbB6dSr0zJqmB2muD2cQqaSHgLGQlJnBx6MFS-LYLA6YZjfCsOvQb9khGGTQTONTpGRb876VyEbM',
    caption: 'She loved the cardamom bun...',
    tag: 'CAFE',
  },
  {
    id: 'ph-comp-2',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYhI2O2CbQPJXIJas4Fts4Y4Zp1bf5WIimfD1RRzFlvUyve56rbVmPdfwpWQP6X7gyTW72ZLvAOoQIf4f4tb7DE8YCk3PrxU7Xooyt1CNZt2vN-F0Vb5m6g7wTQsRWtcX8Ibbj57Tme7h4tZqCRXpGpvJdwq44rpqy6pBPO68dnse4Dc12gVKzrsitM2EcOpWCD7iMFqi2ReJkIQ9yTrMHx_ypi9kA-jD66zYnypXJ',
    caption: 'Holding our handwritten love note across the table',
    tag: 'BISTRO',
  },
];

export const ComposerView: React.FC<ComposerViewProps> = ({
  profile,
  editingMemory,
  totalMemoriesCount,
  onSaveMemory,
  onToast,
  // (2026-07-13) Destructure onDirtyChange; was unhandled
  onDirtyChange,
  existingMemories,
}) => {
  // (2026-07-13) Default date to today & tags empty; was hardcoded date and tags
  const [dateISO, setDateISO] = useState(editingMemory?.dateISO || getTodayISO());
  // (2026-07-13) Set default location to Bogo City, Cebu & all-day; was Soho
  const [timeFormatted, setTimeFormatted] = useState(
    editingMemory?.timeFormatted || 'All Day'
  );
  const [location, setLocation] = useState(
    editingMemory?.location || 'Bogo City, Cebu'
  );
  const [weatherTemp, setWeatherTemp] = useState(editingMemory?.weatherTemp || '');
  const [weatherConditions, setWeatherConditions] = useState(
    editingMemory?.weatherConditions || ''
  );
  const [moodVibe, setMoodVibe] = useState(editingMemory?.moodVibe || '');
  const [title, setTitle] = useState(editingMemory?.title || '');
  const [letterHeading, setLetterHeading] = useState(editingMemory?.letterHeading || '');
  // (2026-07-13) Fallback storyBody to snippet when editing memory; was empty
  const [storyBody, setStoryBody] = useState(
    editingMemory?.storyBody || editingMemory?.snippet || ''
  );
  const [quoteHighlight, setQuoteHighlight] = useState(editingMemory?.quoteHighlight || '');

  // (2026-07-13) Suggest title from heartfelt note if not entered; was none
  const suggestedTitle = useMemo(() => {
    if (!storyBody || !storyBody.trim()) return '';
    const cleaned = storyBody.replace(/^["'“‘\s]+|["'”’\s]+$/g, '').trim();
    if (!cleaned) return '';
    const firstSentence = cleaned.split(/[\r\n.!?]+/)[0]?.trim() || '';
    if (!firstSentence) return '';
    if (firstSentence.length <= 40) {
      return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
    }
    const words = firstSentence.split(/\s+/).slice(0, 6).join(' ');
    return (words.charAt(0).toUpperCase() + words.slice(1)).replace(/[,;:]+$/, '') + '...';
  }, [storyBody]);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    editingMemory?.vibeTags || []
  );
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedDots, setSelectedDots] = useState<DotIndicator[]>(
    editingMemory?.dotIndicators || ['MOCHA']
  );

  // (2026-07-13) Match existing memory for date to allow seamless edits; was duplicate block
  const existingForDate = useMemo(() => {
    if (!existingMemories) return null;
    return existingMemories.find((m) => m.dateISO === dateISO) || null;
  }, [existingMemories, dateISO]);

  // (2026-07-13) Auto-load content when date matches existing memory; was blank form
  useEffect(() => {
    if (existingForDate && !editingMemory && !storyBody) {
      setTitle(existingForDate.title || '');
      setLetterHeading(existingForDate.letterHeading || '');
      setStoryBody(existingForDate.storyBody || existingForDate.snippet || '');
      setQuoteHighlight(existingForDate.quoteHighlight || '');
      setSelectedTags(existingForDate.vibeTags || []);
      setSelectedDots(existingForDate.dotIndicators || ['MOCHA']);
      setPhotos(existingForDate.photos || []);
      if (existingForDate.audioMemo?.url) {
        setVoiceTitle(existingForDate.audioMemo.title || `Whispered note for ${profile.partner2Name}`);
        setVoiceDurationSec(existingForDate.audioMemo.durationSeconds || 42);
        setVoiceDataUrl(existingForDate.audioMemo.url);
      }
    }
  }, [existingForDate, editingMemory, storyBody, profile.partner2Name]);

  // Voice Note State
  const [voiceTitle, setVoiceTitle] = useState(
    editingMemory?.audioMemo?.title || `Whispered note for ${profile.partner2Name}`
  );
  const [voiceDurationSec, setVoiceDurationSec] = useState(
    editingMemory?.audioMemo?.durationSeconds || 42
  );
  const [voiceDataUrl, setVoiceDataUrl] = useState<string | undefined>(
    editingMemory?.audioMemo?.url
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const recordTimerRef = useRef<number | null>(null);

  // (2026-07-13) Start new memories with empty polaroids vs prefilled sample photos
  const [photos, setPhotos] = useState<PolaroidPhoto[]>(
    editingMemory ? editingMemory.photos : []
  );
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Video Capsule State
  const [hasVideo, setHasVideo] = useState<boolean>(Boolean(editingMemory?.videoCapsule));
  const [videoTitle, setVideoTitle] = useState(
    editingMemory?.videoCapsule?.title || `Candid moment with ${profile.partner2Name} (22s)`
  );
  const [videoDuration, setVideoDuration] = useState(
    editingMemory?.videoCapsule?.durationFormatted || '0:22'
  );
  const [videoUrl, setVideoUrl] = useState<string | undefined>(
    editingMemory?.videoCapsule?.url
  );
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // (2026-07-13) Add manual audio uploader ref & body scroll lock; was mic only
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [sealingAnim, setSealingAnim] = useState(false);

  // (2026-07-13) Auto-adjust story textarea height; was fixed 5 rows
  const storyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(220, el.scrollHeight)}px`;
  };

  useEffect(() => {
    adjustTextareaHeight(storyTextareaRef.current);
  }, [storyBody]);

  // (2026-07-13) Emit unsaved dirty status for tab switch modal; was untracked
  const isDirty = useMemo(() => {
    if (!editingMemory) {
      return Boolean(
        title.trim() ||
        storyBody.trim() ||
        quoteHighlight.trim() ||
        photos.length > 0 ||
        voiceDataUrl ||
        videoUrl ||
        location !== 'Bogo City, Cebu'
      );
    }
    return (
      title !== (editingMemory.title || '') ||
      storyBody !== (editingMemory.storyBody || editingMemory.snippet || '') ||
      quoteHighlight !== (editingMemory.quoteHighlight || '') ||
      location !== (editingMemory.location || 'Bogo City, Cebu') ||
      photos.length !== (editingMemory.photos?.length || 0) ||
      voiceDataUrl !== editingMemory.audioMemo?.url ||
      videoUrl !== editingMemory.videoCapsule?.url
    );
  }, [
    editingMemory,
    title,
    storyBody,
    quoteHighlight,
    photos,
    voiceDataUrl,
    videoUrl,
    location,
  ]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // (2026-07-13) Sync form state when editing memory changes; was initial only
  useEffect(() => {
    if (editingMemory) {
      setDateISO(editingMemory.dateISO || getTodayISO());
      setTimeFormatted(editingMemory.timeFormatted || 'All Day');
      setLocation(editingMemory.location || 'Bogo City, Cebu');
      setWeatherTemp(editingMemory.weatherTemp || '');
      setWeatherConditions(editingMemory.weatherConditions || '');
      setMoodVibe(editingMemory.moodVibe || '');
      setTitle(editingMemory.title || '');
      setLetterHeading(editingMemory.letterHeading || '');
      setStoryBody(editingMemory.storyBody || editingMemory.snippet || '');
      quoteHighlight !== undefined && setQuoteHighlight(editingMemory.quoteHighlight || '');
      setSelectedTags(editingMemory.vibeTags || []);
      setSelectedDots(editingMemory.dotIndicators || ['MOCHA']);
      setPhotos(editingMemory.photos || []);
      setVoiceTitle(editingMemory.audioMemo?.title || `Whispered note for ${profile.partner2Name}`);
      setVoiceDurationSec(editingMemory.audioMemo?.durationSeconds || 42);
      setVoiceDataUrl(editingMemory.audioMemo?.url);
      setHasVideo(Boolean(editingMemory.videoCapsule));
      setVideoTitle(editingMemory.videoCapsule?.title || `Candid moment with ${profile.partner2Name}`);
      setVideoDuration(editingMemory.videoCapsule?.durationFormatted || '0:22');
      setVideoUrl(editingMemory.videoCapsule?.url);
      setTimeout(() => adjustTextareaHeight(storyTextareaRef.current), 50);
    }
  }, [editingMemory]);

  useEffect(() => {
    if (metaModalOpen || Boolean(pendingCropSrc)) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [metaModalOpen, pendingCropSrc]);

  const handleSelectAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|opus|weba)$/i.test(file.name)) {
      onToast('Please upload an audio recording file (.wav, .mp3, etc.)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setVoiceDataUrl(dataUrl);

      const tempAudio = new Audio();
      tempAudio.src = dataUrl;
      tempAudio.onloadedmetadata = () => {
        const sec = Math.round(tempAudio.duration) || 42;
        setVoiceDurationSec(sec);
      };

      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setVoiceTitle(cleanFileName || `Voice note for ${profile.partner2Name}`);
      onToast(`Audio file attached: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const clean = customTagInput.trim();
    if (!clean) return;
    if (!selectedTags.includes(clean)) {
      setSelectedTags((prev) => [...prev, clean]);
    }
    setCustomTagInput('');
  };

  const toggleDot = (dot: DotIndicator) => {
    setSelectedDots((prev) => {
      if (prev.includes(dot)) {
        return prev.length > 1 ? prev.filter((d) => d !== dot) : prev;
      }
      return [...prev, dot];
    });
  };

  const handleToggleRecording = async () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordElapsed(0);
      await audioEngine.startRecording();
      recordTimerRef.current = window.setInterval(() => {
        setRecordElapsed((prev) => {
          if (prev >= 120) {
            handleStopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
      // (2026-07-13) Rename seal audio prompt to save; was seal audio
      onToast('Recording voice note... Tap again to save audio.', 'info');
    } else {
      await handleStopRecording();
    }
  };

  const handleStopRecording = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    const res = await audioEngine.stopRecording();
    setVoiceDurationSec(res.durationSeconds);
    if (res.dataUrl) {
      setVoiceDataUrl(res.dataUrl);
    }
    onToast(`Voice note captured (${formatDuration(res.durationSeconds)})!`, 'success');
  };

  const handleSelectPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingCropSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    setHasVideo(true);
    setVideoUrl(url);
    setVideoTitle(file.name.replace(/\.[^.]+$/, '') || 'Uploaded Motion Capsule');
    onToast('Video Capsule attached & optimized for storage!', 'success');
  };

  // (2026-07-13) Capitalize first letters on title & story; was lowercase raw
  const buildMemoryPayload = (isDraft: boolean): KeepsakeMemory => {
    const rawTitle =
      title.trim() ||
      suggestedTitle ||
      `A Keepsake for ${formatStandardDate(dateISO)}`;
    const cleanTitle = capitalizeFirstLetters(rawTitle);
    const rawBody =
      storyBody.trim() ||
      `Another unforgettable day with ${profile.partner2Name} in ${location}. I wrote this down so we never forget how warm and peaceful this moment felt.`;
    const cleanBody = capitalizeFirstLetters(rawBody);
    const categories: MemoryCategory[] = ['EVENT'];
    if (photos.length > 0) categories.push('PHOTO');
    if (voiceDataUrl) categories.push('VOICE_MEMO');
    if (hasVideo && videoUrl) categories.push('VIDEO');
    // (2026-07-13) Check BURGUNDY or Anniversary for milestone category; was ROSE
    if (selectedDots.includes('BURGUNDY') || selectedTags.includes('Anniversary')) {
      categories.push('ANNIVERSARY');
    }

    // (2026-07-13) Dynamic chapter number from courting date; was fixed 15 / II
    const calculatedChapter = getChapterNumber(dateISO, profile.courtingDateISO || '2025-11-07');

    // (2026-07-13) Use existing date record ID to update in-place; was always new id
    return {
      id: editingMemory?.id || existingForDate?.id || `mem-${Date.now()}`,
      keepsakeNumber: editingMemory?.keepsakeNumber || existingForDate?.keepsakeNumber || 85 + totalMemoriesCount,
      volumeNumber: editingMemory?.volumeNumber || existingForDate?.volumeNumber || calculatedChapter,
      dateISO,
      timeFormatted: timeFormatted.trim() || 'All Day',
      title: cleanTitle,
      letterHeading: letterHeading.trim() || cleanTitle,
      snippet: cleanBody.slice(0, 175) + (cleanBody.length > 175 ? '...' : ''),
      storyBody: cleanBody,
      quoteHighlight: quoteHighlight.trim(),
      signOffAuthor: `${profile.partner1Name} • St. ${editingMemory?.volumeNumber || calculatedChapter}`,
      location: location.trim() || 'Bogo City, Cebu',
      weatherTemp: '',
      weatherConditions: '',
      moodVibe: '',
      vibeTags: selectedTags,
      categories,
      dotIndicators: selectedDots,
      photos,
      // (2026-07-13) Only attach audioMemo if user actually uploaded audio vs dummy
      audioMemo: voiceDataUrl
        ? {
            id: editingMemory?.audioMemo?.id || `aud-${Date.now()}`,
            title: voiceTitle.trim() || `Whispered note for ${profile.partner2Name}`,
            url: voiceDataUrl,
            durationSeconds: voiceDurationSec,
            durationFormatted: formatDuration(voiceDurationSec),
            waveformPeaks: [35, 65, 90, 50, 80, 60, 95, 70, 45, 75, 85, 55, 40, 65, 45, 30],
            isFavorite: editingMemory?.audioMemo?.isFavorite ?? true,
          }
        : undefined,
      videoCapsule: hasVideo
        ? {
            id: editingMemory?.videoCapsule?.id || `vid-${Date.now()}`,
            title: videoTitle,
            url: videoUrl,
            thumbnailUrl:
              photos[0]?.url ||
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDA5pyX2Wv5H9GJg4tRmBwcg2Sp_yzAzCTFtWiNWJvFlBbyD6TQfOa_a1zc3_d8IWiOLv7gmNVT2AcX0ZXDN7I60ryxTZBbWootzYOroXkJIm80QxFDPipcJvPfd6vHfrFV6MJAMmXT842Xm2jBiIB8gG-2OPzzIYN3dppgmGdEzU_tKXCaz5Hb3bI1q3BZrYn-jhlRfI-yEbU5wXsR63r1NbFXMSpJMW_ACMhaKJNh',
            durationFormatted: videoDuration,
            resolution: '1080p HD',
          }
        : undefined,
      partnerNotes: editingMemory?.partnerNotes || [],
      isSealed: !isDraft,
      isDraft,
      // (2026-07-13) Set sealLabel with dynamic chapter number; was Chapter II
      sealLabel: isDraft
        ? 'Saved Draft on Desk'
        : `Sealed in Chapter ${calculatedChapter} • ${profile.partner1Name} & ${profile.partner2Name}`,
      sealIcon: isDraft ? 'edit_note' : 'spa',
      updatedAt: Date.now(),
      sortOrder: editingMemory?.sortOrder ?? 0,
    };
  };

  // (2026-07-13) Seal memory updating record for date in-place; was duplicate block
  const handleSealSubmit = () => {
    setSealingAnim(true);
    setTimeout(() => {
      setSealingAnim(false);
      const payload = buildMemoryPayload(false);
      onSaveMemory(payload, false);
    }, 220);
  };

  // (2026-07-13) Save draft updating record in-place; was duplicate block
  const handleDraftSubmit = () => {
    const payload = buildMemoryPayload(true);
    onSaveMemory(payload, true);
  };

  return (
    <div className="flex flex-col w-full px-margin pb-space-xl max-w-[760px] mx-auto">
      {/* Whimsical Vignette & Header */}
      <div className="relative pt-space-md pb-space-lg text-center flex flex-col items-center">
        <div className="relative mb-space-sm flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-secondary-container/40 flex items-center justify-center shadow-sm">
            <svg
              className="w-10 h-10 text-secondary"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 48 48"
            >
              <path d="M14 34c0-7 4-13 12-13 5 0 9 3 11 8 .5 1.5 1.5 3 3 3h1c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5h-5c-2 0-3 1-4 2" />
              <path d="M14 26c-2 0-4-1.5-4-4 0-3 2-6 5-6h5c3 0 5 2 5 5v5" />
              <circle cx="17" cy="20" fill="currentColor" r="1.2" />
              <path d="M12 22c-1 .2-2 .8-2 1.8" />
              <path d="M22 16c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3" />
              <path d="M31 28c3-4 7-9 11-13-1 4-3 9-5 12" stroke="#cca440" strokeWidth="2" />
              <path d="M37 20c-1.5-1-3-1-4 .5" stroke="#cca440" />
              <circle cx="39" cy="18" fill="#cca440" r="1.5" />
            </svg>
          </div>
          <span className="absolute -top-1 -right-2 text-tertiary-fixed-dim material-symbols-outlined text-[18px]">
            auto_awesome
          </span>
        </div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight font-serif">
          {editingMemory ? 'Refine Our Keepsake Chapter' : "Preserve Today's Chapter"}
        </h2>
        {/* (2026-07-13) Update romantic subtitle quote; was Every little moment */}
        <p className="font-italic-quote text-italic-quote text-secondary mt-space-xs max-w-xs leading-relaxed font-serif italic">
          You&apos;re the closest to heaven, that I&apos;ll ever be, baby
        </p>
      </div>

      {/* Primary Journal Desk Canvas */}
      <div className="flex flex-col gap-space-lg">
        {/* Context Pills: Date & Location Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <button
            type="button"
            onClick={() => setMetaModalOpen(true)}
            className="group flex items-center justify-between px-space-md py-space-sm bg-surface-container-low text-primary rounded-full shadow-sm active:scale-[0.99] transition-transform text-left border border-outline-variant/30"
          >
            <div className="flex items-center gap-space-sm min-w-0">
              <span className="material-symbols-outlined text-[20px] text-secondary">
                calendar_today
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                  Date
                </span>
                <span className="font-body-md text-body-md font-medium text-primary truncate-single">
                  {formatStandardDate(dateISO)} • Whole Day Note
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[18px] text-outline-variant group-hover:text-primary">
              expand_more
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMetaModalOpen(true)}
            className="group flex items-center justify-between px-space-md py-space-sm bg-surface-container-low text-primary rounded-full shadow-sm active:scale-[0.99] transition-transform text-left border border-outline-variant/30"
          >
            <div className="flex items-center gap-space-sm min-w-0">
              <span className="material-symbols-outlined text-[20px] text-tertiary-container">
                location_on
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                  Location
                </span>
                <span className="font-body-md text-body-md font-medium text-primary truncate-single">
                  {location}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[18px] text-outline-variant group-hover:text-primary">
              edit
            </span>
          </button>
        </div>

        {/* (2026-07-13) Show active edit banner for existing date; was blocking alert */}
        {existingForDate && (
          <div className="flex items-center gap-space-sm p-3 bg-secondary-container/30 border border-secondary/20 rounded-xl text-primary text-body-sm">
            <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">
              edit_note
            </span>
            <span className="flex-1 min-w-0">
              {/* (2026-07-13) Rename Sealing notice to Saving; was Sealing */}
              Editing keepsake for <strong>{formatStandardDate(dateISO)}</strong>. Saving will update this date&apos;s memory in your memory box.
            </span>
          </div>
        )}

        {/* Editorial Title & Ruled Note Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm relative overflow-hidden flex flex-col border border-outline-variant/30">
          {/* Faint Capybara Botanical Watermark in corner */}
          <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.06] pointer-events-none text-primary">
            <svg fill="currentColor" viewBox="0 0 100 100">
              <path d="M20 70c0-18 12-32 30-32 15 0 26 8 30 20 2 4 4 8 8 8h4c4 0 6 3 6 7s-3 7-6 7h-12c-5 0-8 3-10 6H20z" />
              <circle cx="32" cy="48" r="4" />
              <circle cx="56" cy="24" r="8" />
              <path d="M50 16c2-4 6-6 10-6 2 4 1 8-2 10" />
            </svg>
          </div>

          {/* (2026-07-13) Suggest title from note if none entered; was static placeholder */}
          <div className="mb-space-md relative">
            <div className="flex items-center justify-between mb-space-xs flex-wrap gap-1">
              <label
                className="font-label-md text-label-md uppercase tracking-wider text-outline block"
                htmlFor="memory-title"
              >
                Title of this moment
              </label>
              {suggestedTitle && !title.trim() && (
                <button
                  type="button"
                  onClick={() => setTitle(suggestedTitle)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-secondary-container/70 hover:bg-secondary-container px-2.5 py-0.5 rounded-full transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                  <span>Suggest title: “{suggestedTitle}”</span>
                </button>
              )}
            </div>
            <input
              id="memory-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                suggestedTitle
                  ? `Suggested: "${suggestedTitle}"`
                  : 'E.g., Sunday morning pastries and warm coffee...'
              }
              className="w-full bg-transparent font-headline-sm text-headline-sm text-primary placeholder:text-outline-variant focus:outline-none pb-space-xs font-serif"
            />
            <div className="w-full h-px bg-surface-container-high" />
          </div>

          {/* (2026-07-13) Set Google font & auto-expanding textarea; was ruled-notebook */}
          <div className="relative">
            <label
              className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-space-xs"
              htmlFor="memory-narrative"
            >
              The Heartfelt Note
            </label>
            <div className="relative rounded-xl bg-surface-container-low/40 p-4 border border-outline-variant/20">
              <textarea
                ref={storyTextareaRef}
                id="memory-narrative"
                value={storyBody}
                onChange={(e) => {
                  setStoryBody(e.target.value);
                  adjustTextareaHeight(e.target);
                }}
                placeholder={`Write down how ${profile.partner2Name} smiled, what she said, the quiet moments you never want to forget...`}
                className="w-full bg-transparent font-['Plus_Jakarta_Sans',sans-serif] text-[15px] sm:text-base text-primary placeholder:text-outline-variant/80 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* (2026-07-13) Memorable quote & summary field; was what partner said */}
          <div className="mt-space-md pt-space-sm border-t border-outline-variant/20 relative">
            <div className="flex items-center justify-between mb-space-xs">
              <label
                className="font-label-md text-label-md uppercase tracking-wider text-outline block"
                htmlFor="memory-quote"
              >
                Memorable Quote &amp; Summary (Highlighted)
              </label>
              <span className="text-[11px] font-medium text-outline uppercase tracking-wider">
                Optional
              </span>
            </div>
            {/* (2026-07-13) Update placeholder to memorable quote summary vs whispered */}
            <input
              id="memory-quote"
              type="text"
              value={quoteHighlight}
              onChange={(e) => setQuoteHighlight(e.target.value)}
              placeholder="E.g., A memorable quote, phrase, or heartfelt summary of this day (leave blank if none)..."
              // (2026-07-13) Darken quote input text color; was faded text-secondary
              className="w-full bg-transparent font-italic-quote text-body-md italic font-medium text-primary placeholder:text-outline/50 placeholder:font-normal focus:outline-none pb-space-xs font-serif"
            />
            <div className="w-full h-px bg-surface-container-high" />
          </div>

          {/* (2026-07-13) Update dots to Events / Date / Milestone; was Photos & Voice */}
          <div className="mt-space-md pt-space-sm border-t border-outline-variant/20">
            <span className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-space-xs">
              Calendar Ribbon Dots
            </span>
            <div className="flex flex-wrap gap-2">
              {/* (2026-07-13) Add Intimacy rose & Milestone burgundy dots; was 3 dots */}
              {[
                { id: 'GOLD' as DotIndicator, label: 'Events', color: '#E5A93C' },
                { id: 'MOCHA' as DotIndicator, label: 'Date', color: '#5C4033' },
                { id: 'ROSE' as DotIndicator, label: 'Intimacy', color: '#C96B78' },
                { id: 'BURGUNDY' as DotIndicator, label: 'Milestone', color: '#8B263E' },
              ].map((d) => {
                const active = selectedDots.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDot(d.id)}
                    className={`px-3 py-1 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vibe & Memory Tags Carousel */}
          <div className="mt-space-md pt-space-sm">
            <span className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-space-sm">
              Vibe &amp; Memory Tags
            </span>
            <div className="flex flex-wrap gap-space-xs">
              {Array.from(new Set([...DEFAULT_VIBE_TAGS, ...selectedTags])).map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-space-md py-1.5 rounded-full font-label-lg text-label-lg transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="Add custom tag..."
                className="px-3 py-1.5 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high text-primary font-label-md text-label-md uppercase"
              >
                + Tag
              </button>
            </div>
          </div>
        </div>

        {/* (2026-07-13) Clean up media cards UI; was cluttered containers */}
        {/* Media attachment section */}
        <div id="composer-media-attachments-vault" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-['Playfair_Display',Georgia,serif] text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">
                attachment
              </span>
              <span>Attach Keepsakes</span>
            </h3>
            <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
              Vault Media
            </span>
          </div>

          {/* 1. Voice Note Recording Module */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary-container/60 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">mic</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary font-['Plus_Jakarta_Sans',sans-serif]">
                    Her Voice &amp; Whispers
                  </h4>
                  <p className="text-[11px] text-outline">
                    {voiceDataUrl ? 'Audio recording attached' : `Capture ${profile.partner2Name}'s voice or a note`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-outline font-medium">
                {isRecording
                  ? `${formatDuration(recordElapsed)} / 02:00`
                  : `${formatDuration(voiceDurationSec)}`}
              </span>
            </div>

            <input
              type="text"
              value={voiceTitle}
              onChange={(e) => setVoiceTitle(e.target.value)}
              placeholder="Voice note title (e.g., Laughing at the icy waves)..."
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low text-primary text-xs border border-outline-variant/20 focus:border-primary focus:outline-none transition-colors"
            />

            <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
              <button
                type="button"
                onClick={handleToggleRecording}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs ${
                  isRecording ? 'bg-error text-white animate-pulse' : 'bg-primary text-on-primary hover:bg-primary/90'
                }`}
                title={isRecording ? 'Stop recording' : 'Record voice memo'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isRecording ? 'stop' : 'mic'}
                </span>
              </button>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-xs text-on-surface truncate-single font-medium">
                  {isRecording
                    ? 'Recording live microphone... Tap to finish'
                    : voiceDataUrl
                      ? 'Preview voice recording'
                      : `Tap mic to record ${profile.partner2Name}'s voice`}
                </p>
                <div className="w-full h-4 flex items-center gap-1 mt-1 overflow-hidden opacity-75">
                  {[2, 3, 5, 4, 6, 3, 5, 2, 4, 5, 3, 2, 4, 6, 3, 2].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h * 2.5}px` }}
                      className={`w-1 rounded-full transition-colors ${
                        isRecording && i % 2 === 0
                          ? 'bg-error animate-pulse'
                          : voiceDataUrl
                            ? 'bg-secondary'
                            : 'bg-outline-variant'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {voiceDataUrl && (
                <button
                  type="button"
                  onClick={() =>
                    audioEngine.toggleTrack('composer-preview', voiceDurationSec, voiceDataUrl)
                  }
                  className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-primary hover:bg-secondary-container transition-colors shrink-0"
                  title="Play audio preview"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-primary text-xs font-semibold flex items-center justify-center gap-1.5 border border-outline-variant/25 active:scale-98 transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">upload_file</span>
                <span>{voiceDataUrl ? 'Replace Audio File' : 'Upload Audio (.mp3, .wav, .m4a)'}</span>
              </button>
              {voiceDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceDataUrl(undefined);
                    onToast('Voice note removed', 'info');
                  }}
                  title="Remove sound recording"
                  className="w-8 h-8 rounded-xl bg-surface-container-low text-error hover:bg-error-container/40 border border-outline-variant/25 flex items-center justify-center transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </button>
              )}
            </div>
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.weba"
              onChange={handleSelectAudioFile}
              className="hidden"
            />
          </div>

          {/* 2. Photo Polaroids Scrapbook Section */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary-container/60 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">photo_camera</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary font-['Plus_Jakarta_Sans',sans-serif]">
                    Polaroids &amp; Photos
                  </h4>
                  <p className="text-[11px] text-outline">
                    {photos.length === 0 ? 'No photos attached' : `${photos.length} polaroid${photos.length > 1 ? 's' : ''} in scrapbook`}
                  </p>
                </div>
              </div>
              <span className="text-xs uppercase tracking-wider text-secondary font-semibold">
                {photos.length} Attached
              </span>
            </div>

            <div
              onClick={() => photoInputRef.current?.click()}
              className="border-2 border-dashed border-outline-variant/40 hover:border-primary/50 bg-surface-container-low/40 hover:bg-surface-container-low rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
            >
              <div className="w-11 h-11 rounded-full bg-surface-container-high text-secondary group-hover:text-primary group-hover:scale-105 transition-all flex items-center justify-center mb-1">
                <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-primary">
                Upload Images to Turn into Polaroids
              </span>
              <span className="text-[11px] text-outline max-w-xs">
                Tap to choose photos • 1600px high-resolution cropper
              </span>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-1">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="bg-[#ffffff] p-3 rounded-xl shadow-xs border border-[#e2dcd5] flex flex-col items-center gap-2"
                  >
                    <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-surface-container relative">
                      <img
                        className="w-full h-full object-cover"
                        alt={photo.caption || 'Polaroid Memory'}
                        src={photo.url}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPhotos((prev) => prev.filter((item) => item.id !== photo.id))
                        }
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary/80 hover:bg-primary text-on-primary flex items-center justify-center text-xs backdrop-blur-sm shadow-sm transition-transform active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </div>
                    <div className="w-full flex flex-col gap-1 px-1">
                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPhotos((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, caption: val } : p))
                          );
                        }}
                        placeholder={`Caption for ${profile.partner2Name}...`}
                        className="w-full bg-transparent font-['Cormorant_Garamond',serif] italic text-sm text-primary placeholder:text-outline/60 focus:outline-none border-b border-outline-variant/30 pb-0.5 text-center"
                      />
                      <div className="flex items-center justify-between text-[10px] text-secondary font-mono">
                        <span>Polaroid #{index + 1}</span>
                        <span>{photo.tag || 'MEMO'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectPhotoFile}
              className="hidden"
            />
          </div>

          {/* 3. Video Capsule Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary-container/60 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">movie</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary font-['Plus_Jakarta_Sans',sans-serif]">
                    Motion Video Capsule
                  </h4>
                  <p className="text-[11px] text-outline">
                    {hasVideo ? 'Video clip attached' : 'Add short video reel or moment'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-high px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span className="text-[10px] uppercase font-semibold text-primary">
                  HD 1080p
                </span>
              </div>
            </div>

            {hasVideo ? (
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Attached Video ({videoDuration})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasVideo(false);
                      setVideoUrl(undefined);
                    }}
                    className="text-error text-xs font-semibold hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Video caption or title..."
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary text-xs border border-outline-variant/20 focus:outline-none"
                />
              </div>
            ) : (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="border border-outline-variant/30 hover:border-primary/50 bg-surface-container-low/40 hover:bg-surface-container-low rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high text-secondary group-hover:text-primary group-hover:scale-105 transition-all flex items-center justify-center mb-0.5">
                  <span className="material-symbols-outlined text-[20px]">movie_filter</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-primary">
                  Upload 4K / HD Video Clip
                </p>
                <p className="text-[11px] text-outline">
                  Auto-optimized for streaming storage
                </p>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleSelectVideoFile}
              className="hidden"
            />
          </div>
        </div>

        {/* Editorial Footer & Sealing Actions */}
        <div className="pt-space-md flex flex-col gap-space-sm">
          <button
            type="button"
            onClick={handleSealSubmit}
            className={`w-full py-space-md bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg shadow-md hover:bg-primary transition-all flex items-center justify-center gap-space-sm relative overflow-hidden ${
              sealingAnim ? 'scale-95' : 'active:scale-[0.98]'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0 shadow-inner">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            {/* (2026-07-13) Rename Seal button to Save; was Seal into Our Memory Box */}
            <span className="tracking-wide font-semibold text-surface-bright">
              Save to Our Memory Box
            </span>
          </button>

          <button
            type="button"
            onClick={handleDraftSubmit}
            className="w-full py-space-sm bg-surface-container-low text-secondary hover:text-primary rounded-xl font-label-lg text-label-lg transition-colors text-center active:scale-[0.99]"
          >
            Save Draft to Desk
          </button>
        </div>
      </div>

      {/* (2026-07-13) Render modals with createPortal to escape navbar z-index */}
      {pendingCropSrc &&
        createPortal(
          <ImageCropperModal
            imageSrc={pendingCropSrc}
            onCancel={() => setPendingCropSrc(null)}
            onComplete={(finalUrl, caption, tag) => {
              setPhotos((prev) => [
                ...prev,
                {
                  id: `ph-${Date.now()}`,
                  url: finalUrl,
                  caption,
                  tag,
                },
              ]);
              setPendingCropSrc(null);
              onToast('High-resolution Polaroid developed & attached!', 'success');
            }}
          />,
          document.body
        )}

      {/* Date, Location & Weather Metadata Modal */}
      {metaModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setMetaModalOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-3.5"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
                <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                  Date &amp; Location
                </h3>
                <button
                  type="button"
                  onClick={() => setMetaModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div>
                <label className="font-label-md text-label-md uppercase text-outline block mb-1">
                  Date (Whole Day Note)
                </label>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
                />
                {/* (2026-07-13) Inline date notice in modal; was blocking alert */}
                {existingForDate && (
                  <p className="text-xs text-secondary mt-1 font-medium">
                    ✓ Existing memory found for this date. Editing will update it.
                  </p>
                )}
              </div>
              <div>
                <label className="font-label-md text-label-md uppercase text-outline block mb-1">
                  Location Geotag
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Bogo City, Cebu"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
                />
              </div>
              {/* (2026-07-13) Remove temperature, sky weather & mood badge; was present */}
              <button
                type="button"
                onClick={() => setMetaModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase shadow-md mt-1"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
