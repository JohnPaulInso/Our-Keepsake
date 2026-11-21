// (2026-07-13) Add React Router /backup route & clean-slate handlers vs single view
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ActiveTab,
  CoupleProfile,
  DailyBackupRecord,
  DigitalLoveLetter,
  DotIndicator,
  KeepsakeMemory,
  MemoryCategory,
  SecretYearNote,
  TimeCapsuleItem,
} from './types';
import { CAPYBARA_SEAL_LOGO, COUPLE_AVATAR_URL } from './data/seedMemories';
import { DB } from './db/localDb';
import { syncManager } from './db/firebaseSync';
import { TimelineView } from './views/TimelineView';
import { StoryReaderView } from './views/StoryReaderView';
import { ComposerView } from './views/ComposerView';
import { CapsuleVaultView } from './views/CapsuleVaultView';
import { SecretYearLettersView } from './views/SecretYearLettersView';
import { BackupVaultPage } from './views/BackupVaultPage';
// (2026-07-13) Import MonthlyNotepadView for notepad tab; was unimported
import { MonthlyNotepadView } from './views/MonthlyNotepadView';
import { ToastContainer, ToastItem } from './components/ToastContainer';
import { CoupleStudioModal } from './components/CoupleStudioModal';
// (2026-07-13) Import PinLockModal for startup passcode gate; was unimported
import { PinLockModal } from './components/PinLockModal';
// (2026-07-13) Import capitalizeFirstLetters & getTodayISO; was without capitalize
import { capitalizeFirstLetters, formatStandardDate, getChapterNumber, getTodayISO } from './utils/dateFormat';
// (2026-07-13) Import Capacitor App for hardware back button; was unhandled
import { App as CapApp } from '@capacitor/app';
// (2026-07-13) Import modal manager for hierarchical LIFO back dismissal per Rule 16
import { pushModal, popModal, closeAllModals, getOpenModalCount } from './utils/modalManager';

export const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // (2026-07-13) Render priority months immediately on first frame; was blocking skeleton
  const [isHydrating, setIsHydrating] = useState(false);
  const [isSkeletonRefreshing, setIsSkeletonRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => DB.getActiveTab());
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>(() =>
    DB.getSelectedMemoryId()
  );
  const [editingMemory, setEditingMemory] = useState<KeepsakeMemory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [studioModalOpen, setStudioModalOpen] = useState(false);
  // (2026-07-13) Track target year/month for Monthly Notepad; was always today
  const [notepadTarget, setNotepadTarget] = useState<{ year: number; month: number } | null>(null);
  // (2026-07-13) Track saved dateISO to reopen fullscreen overlay; was Story tab
  const [pendingOverlayDateISO, setPendingOverlayDateISO] = useState<string | null>(null);
  // (2026-07-13) Confirm modal state for Story mobile header delete; was in child
  const [storyHeaderDeleteConfirmOpen, setStoryHeaderDeleteConfirmOpen] = useState(false);
  // (2026-07-13) Add startup PIN 7777 unlock state; was unguarded
  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ok_sanctuary_pin_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Hydrated DB states
  const [profile, setProfile] = useState<CoupleProfile>(() => DB.getCoupleProfile());
  const [memories, setMemories] = useState<KeepsakeMemory[]>(() => DB.getMemories());
  const [secretNotes, setSecretNotes] = useState<SecretYearNote[]>(() =>
    DB.getSecretYearNotes()
  );
  // (2026-07-13) Hydrate digitalLoveLetters state vs missing letters state
  const [digitalLoveLetters, setDigitalLoveLetters] = useState<DigitalLoveLetter[]>(() =>
    DB.getDigitalLoveLetters()
  );
  const [timeCapsule, setTimeCapsule] = useState<TimeCapsuleItem>(() =>
    DB.getTimeCapsule()
  );
  // (2026-07-13) Hydrate dailyBackups state for /backup page vs missing list
  const [dailyBackups, setDailyBackups] = useState<DailyBackupRecord[]>(() =>
    DB.getDailyBackups()
  );

  // Unified Toast Queue
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastBackPressRef = useRef<number>(0);

  // Pull-to-refresh touch tracking
  const pullStartYRef = useRef<number | null>(null);
  const [pullOffset, setPullOffset] = useState(0);

  // (2026-07-13) Deduplicate active toasts by message; was unconditional append
  const addToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' | 'danger' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => {
        if (prev.some((t) => t.message === message)) {
          return prev;
        }
        return [...prev.slice(-2), { id, message, type }];
      });
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3400);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // (2026-07-13) Bump calendar lastActiveAt during app interactions; was idle drift
  useEffect(() => {
    let lastRecorded = 0;
    const bumpActiveTime = () => {
      const now = Date.now();
      if (now - lastRecorded < 2500) return;
      lastRecorded = now;
      try {
        const raw = localStorage.getItem('ok_calendar_view_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.lastActiveAt = now;
          localStorage.setItem('ok_calendar_view_state', JSON.stringify(parsed));
        }
      } catch {
        // Ignore
      }
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'];
    events.forEach((ev) => window.addEventListener(ev, bumpActiveTime, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bumpActiveTime));
    };
  }, []);

  // (2026-07-13) Normalize avatar URL with localhost checks; was raw string check
  const getAvatarSrc = (url?: string): string => {
    if (
      !url ||
      url.includes('googleusercontent.com') ||
      url.includes('meandzea') ||
      url.includes('localhost') ||
      url.startsWith('/assets/')
    ) {
      return COUPLE_AVATAR_URL;
    }
    return url;
  };

  // Hydrate IndexedDB before boot per SKILL.md Part 6 Rule 2
  useEffect(() => {
    let mounted = true;
    DB.ready.then(() => {
      if (!mounted) return;
      setProfile(DB.getCoupleProfile());
      setMemories(DB.getMemories());
      setSecretNotes(DB.getSecretYearNotes());
      setDigitalLoveLetters(DB.getDigitalLoveLetters());
      setTimeCapsule(DB.getTimeCapsule());
      setDailyBackups(DB.getDailyBackups());
      setSelectedMemoryId(DB.getSelectedMemoryId());
      setIsHydrating(false);
    });

    const unsub = DB.subscribe(() => {
      setProfile({ ...DB.getCoupleProfile() });
      setMemories([...DB.getMemories()]);
      setSecretNotes([...DB.getSecretYearNotes()]);
      setDigitalLoveLetters([...DB.getDigitalLoveLetters()]);
      setTimeCapsule({ ...DB.getTimeCapsule() });
      setDailyBackups([...DB.getDailyBackups()]);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Apply theme attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', profile.theme || 'light');
  }, [profile.theme]);

  // (2026-07-13) Clear /date/ URL when leaving story tab; was stale path hijack
  const switchTab = useCallback(
    (tab: ActiveTab) => {
      if (tab !== 'story' && location.pathname.startsWith('/date/')) {
        navigate('/', { replace: true });
      }
      setActiveTab(tab);
      DB.setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [location.pathname, navigate]
  );

  // (2026-07-13) Guard tab navigation when composer has unsaved changes; was none
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<ActiveTab | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const requestTabNavigation = useCallback(
    (targetTab: ActiveTab) => {
      if (targetTab === activeTab) return;
      if (activeTab === 'new-date' && hasUnsavedChanges) {
        setPendingTab(targetTab);
        setShowUnsavedModal(true);
        return;
      }
      setEditingMemory(null);
      switchTab(targetTab);
    },
    [activeTab, hasUnsavedChanges, switchTab]
  );

  const requestRouteNavigation = useCallback(
    (targetPath: string) => {
      if (activeTab === 'new-date' && hasUnsavedChanges) {
        setPendingPath(targetPath);
        setShowUnsavedModal(true);
        return;
      }
      setEditingMemory(null);
      navigate(targetPath);
    },
    [activeTab, hasUnsavedChanges, navigate]
  );

  const handleConfirmDiscard = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    setEditingMemory(null);
    if (pendingTab) {
      switchTab(pendingTab);
      setPendingTab(null);
    } else if (pendingPath) {
      navigate(pendingPath);
      setPendingPath(null);
    }
  };

  const handleCancelDiscard = () => {
    setShowUnsavedModal(false);
    setPendingTab(null);
    setPendingPath(null);
  };

  const [openModalsCount, setOpenModalsCount] = useState<number>(0);
  // (2026-07-13) Detect active keyboard to hide bottom nav & center input; was none
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  useEffect(() => {
    const isEditableField = (el: Element | null): el is HTMLElement => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'TEXTAREA' || el.isContentEditable) return true;
      if (tag === 'INPUT') {
        const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
        return !['button', 'checkbox', 'radio', 'range', 'file', 'submit', 'reset', 'color', 'hidden'].includes(type);
      }
      return false;
    };

    const centerEditableElement = (el: HTMLElement) => {
      setTimeout(() => {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          // Ignore scroll error
        }
      }, 120);
    };

    let focusOutTimer: number | null = null;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (isEditableField(target)) {
        if (focusOutTimer) window.clearTimeout(focusOutTimer);
        setIsKeyboardOpen(true);
        centerEditableElement(target);
      }
    };

    const handleFocusOut = () => {
      if (focusOutTimer) window.clearTimeout(focusOutTimer);
      focusOutTimer = window.setTimeout(() => {
        if (!isEditableField(document.activeElement)) {
          setIsKeyboardOpen(false);
        }
      }, 140);
    };

    const handleInput = (e: Event) => {
      const target = e.target as Element | null;
      if (isEditableField(target)) {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          // Ignore
        }
      }
    };

    const baseHeight = window.innerHeight;
    const handleViewportResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const shrunk = vv.height < baseHeight * 0.78;
      if (shrunk || isEditableField(document.activeElement)) {
        setIsKeyboardOpen(shrunk || isEditableField(document.activeElement));
        if (shrunk && isEditableField(document.activeElement)) {
          centerEditableElement(document.activeElement);
        }
      } else {
        setIsKeyboardOpen(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('input', handleInput);
    window.visualViewport?.addEventListener('resize', handleViewportResize);
    return () => {
      if (focusOutTimer) window.clearTimeout(focusOutTimer);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('input', handleInput);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  useEffect(() => {
    const handleStackChange = (e: Event) => {
      const custom = e as CustomEvent<{ count: number }>;
      setOpenModalsCount(custom.detail?.count || 0);
    };
    window.addEventListener('keepsake:modal-stack-changed', handleStackChange);
    return () => window.removeEventListener('keepsake:modal-stack-changed', handleStackChange);
  }, []);

  useEffect(() => {
    if (studioModalOpen) {
      return pushModal('studio-modal', () => setStudioModalOpen(false));
    }
  }, [studioModalOpen]);

  useEffect(() => {
    if (showUnsavedModal) {
      return pushModal('unsaved-modal', () => setShowUnsavedModal(false));
    }
  }, [showUnsavedModal]);

  useEffect(() => {
    if (storyHeaderDeleteConfirmOpen) {
      return pushModal('story-delete-modal', () => setStoryHeaderDeleteConfirmOpen(false));
    }
  }, [storyHeaderDeleteConfirmOpen]);

  // (2026-07-13) Pop top modal LIFO on universal back; was closeAllModals
  const handleUniversalBack = useCallback(() => {
    // 1. Pop top-most open modal (e.g. polaroid lightbox) in LIFO order
    if (popModal()) {
      return;
    }
    if (showUnsavedModal) {
      setShowUnsavedModal(false);
      setPendingTab(null);
      setPendingPath(null);
      return;
    }
    if (studioModalOpen) {
      setStudioModalOpen(false);
      return;
    }
    if (storyHeaderDeleteConfirmOpen) {
      setStoryHeaderDeleteConfirmOpen(false);
      return;
    }
    if (activeTab === 'new-date' && hasUnsavedChanges) {
      setPendingTab('timeline');
      setShowUnsavedModal(true);
      return;
    }
    // 2. Return to root timeline from any opened subview
    if (activeTab !== 'timeline') {
      setEditingMemory(null);
      switchTab('timeline');
      return;
    }
    // 3. Two-step exit confirmation on root timeline
    const now = Date.now();
    if (now - lastBackPressRef.current < 2500) {
      try {
        CapApp.exitApp();
      } catch {
        addToast('Keepsake Vault minimized.', 'info');
      }
    } else {
      lastBackPressRef.current = now;
      addToast('Press back again to exit.', 'warning');
    }
  }, [
    activeTab,
    hasUnsavedChanges,
    showUnsavedModal,
    studioModalOpen,
    storyHeaderDeleteConfirmOpen,
    switchTab,
    addToast,
  ]);

  // Universal hardware, browser, and keyboard back listener
  useEffect(() => {
    let removeCapListener: (() => void) | undefined;
    try {
      const handlePromise = CapApp.addListener('backButton', () => {
        handleUniversalBack();
      });
      removeCapListener = () => {
        handlePromise.then((h) => h.remove()).catch(() => {});
      };
    } catch {
      // Running outside Capacitor
    }

    const handlePopState = () => {
      window.history.pushState({ keepsakeGuard: true }, '');
      handleUniversalBack();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleUniversalBack();
      }
    };

    window.history.pushState({ keepsakeGuard: true }, '');
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (removeCapListener) removeCapListener();
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUniversalBack]);

  // (2026-07-13) Suppress synchronized toast; was addToast on refresh
  const triggerInAppRefresh = useCallback(() => {
    setIsSkeletonRefreshing(true);
    syncManager.pullSnapshot();
    setTimeout(() => {
      setIsSkeletonRefreshing(false);
    }, 650);
  }, []);

  // Touch pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 2) {
      pullStartYRef.current = e.touches[0].clientY;
    } else {
      pullStartYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartYRef.current === null) return;
    const delta = e.touches[0].clientY - pullStartYRef.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPullOffset(Math.min(72, delta * 0.4));
    }
  };

  const handleTouchEnd = () => {
    if (pullOffset > 48) {
      triggerInAppRefresh();
    }
    setPullOffset(0);
    pullStartYRef.current = null;
  };

  // (2026-07-13) Guard /date/ effect so memories refresh never closes editor; was loop
  const lastHandledDatePathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!location.pathname.startsWith('/date/')) {
      lastHandledDatePathRef.current = null;
      return;
    }
    if (lastHandledDatePathRef.current === location.pathname) return;
    const targetDate = location.pathname.replace('/date/', '').trim();
    if (targetDate) {
      const found = memories.find((m) => m.dateISO === targetDate);
      if (found) {
        lastHandledDatePathRef.current = location.pathname;
        setSelectedMemoryId(found.id);
        DB.setSelectedMemoryId(found.id);
        setActiveTab('story');
        DB.setActiveTab('story');
      }
    }
  }, [location.pathname, memories]);

  // CRUD handlers with Optimistic UI Updates + Background Cloud Sync
  const handleOpenMemory = (id: string) => {
    setSelectedMemoryId(id);
    DB.setSelectedMemoryId(id);
    switchTab('story');
    const mem = memories.find((m) => m.id === id);
    if (mem?.dateISO) {
      navigate(`/date/${mem.dateISO}`);
    }
  };

  const handleStartEditMemory = (memory: KeepsakeMemory) => {
    setEditingMemory(memory);
    switchTab('new-date');
  };

  // (2026-07-13) Open today memory or edit if exists; was direct tab navigation
  const handleRecordNewDateClick = () => {
    const todayISO = getTodayISO();
    const existingToday = memories.find((m) => m.dateISO === todayISO);
    if (existingToday) {
      addToast('Today already has a recorded keepsake. Opening it to edit.', 'info');
      handleStartEditMemory(existingToday);
      return;
    }
    setEditingMemory(null);
    requestTabNavigation('new-date');
  };

  // (2026-07-13) Support stayInOverlay when saving from stacked edit modal; was nav
  const handleSaveMemory = async (
    memory: KeepsakeMemory,
    isDraft: boolean,
    stayInOverlay = false
  ) => {
    const now = Date.now();
    const formattedTitle = capitalizeFirstLetters(memory.title);
    const formattedStory = capitalizeFirstLetters(memory.storyBody);
    // (2026-07-13) Merge against fullMemories so saving during stream keeps all dates
    const fullList = DB.getFullMemories();
    const existingIndex = fullList.findIndex(
      (m) => m.id === memory.id || m.dateISO === memory.dateISO
    );
    const targetId =
      existingIndex !== -1 && !fullList[existingIndex].id.endsWith('-imported')
        ? fullList[existingIndex].id
        : `mem-${memory.dateISO}-${now}`;
    const finalId = targetId;

    // (2026-07-13) Set explicit updatedAt timestamp on save; was missing timestamp
    const formattedMemory: KeepsakeMemory = {
      ...memory,
      id: targetId,
      title: formattedTitle,
      storyBody: formattedStory,
      snippet: formattedStory.slice(0, 160) + (formattedStory.length > 160 ? '...' : ''),
      updatedAt: now,
    };
    // (2026-07-13) Strictly deduplicate by dateISO on save; was partial index swap
    const remaining = fullList.filter(
      (m) => m.id !== finalId && m.dateISO !== memory.dateISO
    );
    const nextList = [formattedMemory, ...remaining].sort((a, b) =>
      b.dateISO.localeCompare(a.dateISO)
    );

    setMemories(nextList);
    setSelectedMemoryId(finalId);
    DB.setSelectedMemoryId(finalId);
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    setEditingMemory(null);
    await DB.setMemories(nextList);
    syncManager.pushSnapshot();

    if (isDraft) {
      addToast(`Draft "${formattedMemory.title}" saved to your desk.`, 'info');
      if (!stayInOverlay) switchTab('timeline');
    } else {
      addToast(`"${formattedMemory.title}" saved to your Memory Box!`, 'success');
      if (!stayInOverlay) {
        setPendingOverlayDateISO(formattedMemory.dateISO);
        switchTab('timeline');
      }
    }
  };

  const handleDeleteMemory = async (id: string) => {
    const nextList = memories.filter((m) => m.id !== id);
    await DB.setMemories(nextList);
    syncManager.schedulePush();
    if (nextList.length > 0) {
      setSelectedMemoryId(nextList[0].id);
      DB.setSelectedMemoryId(nextList[0].id);
    }
    addToast('Memory removed from archive.', 'info');
    switchTab('timeline');
  };

  const handleReorderMemories = async (reordered: KeepsakeMemory[]) => {
    await DB.setMemories(reordered);
    syncManager.schedulePush();
  };

  const handleAddPartnerNote = async (memoryId: string, author: string, text: string) => {
    const nextList = memories.map((m) => {
      if (m.id !== memoryId) return m;
      return {
        ...m,
        partnerNotes: [
          ...m.partnerNotes,
          {
            id: `pn-${Date.now()}`,
            author,
            text,
            createdAt: Date.now(),
          },
        ],
        updatedAt: Date.now(),
      };
    });
    await DB.setMemories(nextList);
    syncManager.schedulePush();
  };

  // (2026-07-13) Toggle calendar ribbon dots inline from opened memory; was edit only
  const handleUpdateMemoryDots = async (memoryId: string, nextDots: DotIndicator[]) => {
    const nextList = memories.map((m) => {
      if (m.id !== memoryId) return m;
      const baseCats: MemoryCategory[] = (m.categories || []).filter(
        (c) => c !== 'EVENT' && c !== 'ANNIVERSARY'
      );
      if (nextDots.includes('GOLD')) baseCats.push('EVENT');
      if (nextDots.includes('BURGUNDY')) baseCats.push('ANNIVERSARY');
      return {
        ...m,
        dotIndicators: nextDots,
        categories: baseCats,
        updatedAt: Date.now(),
      };
    });
    setMemories(nextList);
    await DB.setMemories(nextList);
    syncManager.schedulePush();
  };

  // (2026-07-13) Sort polaroid photos in-place; was static photo order
  const handleUpdateMemoryPhotos = async (
    memoryId: string,
    nextPhotos: KeepsakeMemory['photos']
  ) => {
    const nextList = memories.map((m) =>
      m.id === memoryId ? { ...m, photos: nextPhotos, updatedAt: Date.now() } : m
    );
    setMemories(nextList);
    await DB.setMemories(nextList);
    syncManager.schedulePush();
  };

  const handleToggleAudioFavorite = async (memoryId: string) => {
    const nextList = memories.map((m) => {
      if (m.id !== memoryId || !m.audioMemo) return m;
      return {
        ...m,
        audioMemo: {
          ...m.audioMemo,
          isFavorite: !m.audioMemo.isFavorite,
        },
        updatedAt: Date.now(),
      };
    });
    await DB.setMemories(nextList);
    syncManager.schedulePush();
    addToast('Voice Vault favorite updated.', 'success');
  };

  // (2026-07-13) Immediate optimistic state update for notes & letters; was lag
  const handleSaveSecretNote = (note: SecretYearNote) => {
    const exists = secretNotes.some((n) => n.id === note.id);
    const nextList = exists
      ? secretNotes.map((n) => (n.id === note.id ? note : n))
      : [note, ...secretNotes];
    setSecretNotes(nextList);
    DB.setSecretYearNotes(nextList).then(() => syncManager.schedulePush());
  };

  // (2026-07-13) Live sync date entries from notepad to memory ledger; was none
  const handleUpdateMemoriesFromNotepad = async (
    entries: { dateISO: string; story: string }[]
  ) => {
    let nextList = [...memories];
    let hasChanged = false;

    for (const { dateISO, story } of entries) {
      if (!story) continue;
      const cleanStory = capitalizeFirstLetters(story);
      const existingIdx = nextList.findIndex((m) => m.dateISO === dateISO);
      if (existingIdx !== -1) {
        if (nextList[existingIdx].storyBody !== cleanStory) {
          nextList[existingIdx] = {
            ...nextList[existingIdx],
            storyBody: cleanStory,
            snippet: cleanStory.slice(0, 160),
            updatedAt: Date.now(),
          };
          hasChanged = true;
        }
      } else {
        // (2026-07-13) Set dynamic chapter number from courting date; was fixed 15
        const calculatedChapter = getChapterNumber(dateISO, profile.courtingDateISO || '2025-11-07');
        const rawFirstLine = cleanStory.split('\n')[0].slice(0, 36);
        const newMemory: KeepsakeMemory = {
          id: `mem-${dateISO}-${Date.now()}`,
          keepsakeNumber: memories.length + 1,
          volumeNumber: calculatedChapter,
          dateISO,
          timeFormatted: 'All Day',
          title: capitalizeFirstLetters(rawFirstLine) || `Keepsake for ${dateISO}`,
          snippet: cleanStory.slice(0, 160),
          storyBody: cleanStory,
          quoteHighlight: '',
          signOffAuthor: profile.partner1Name,
          location: 'Bogo City, Cebu',
          weatherTemp: '28°C',
          weatherConditions: 'Gentle Breeze',
          moodVibe: 'Tender & Sweet',
          vibeTags: ['Cozy Rainy Day', 'First Time'],
          categories: ['EVENT'],
          dotIndicators: ['MOCHA', 'GOLD'],
          photos: [],
          partnerNotes: [],
          isSealed: true,
          sealLabel: `Sealed in Chapter ${calculatedChapter} • ${profile.partner1Name} & ${profile.partner2Name}`,
          sealIcon: 'favorite',
          sortOrder: 1,
          updatedAt: Date.now(),
        };
        nextList.unshift(newMemory);
        hasChanged = true;
      }
    }

    if (hasChanged) {
      setMemories(nextList);
      await DB.setMemories(nextList);
      syncManager.schedulePush();
    }
  };

  const handleDeleteSecretNote = (id: string) => {
    const nextList = secretNotes.filter((n) => n.id !== id);
    setSecretNotes(nextList);
    DB.setSecretYearNotes(nextList).then(() => syncManager.schedulePush());
  };

  const handleToggleFavoriteSecretNote = (id: string) => {
    const nextList = secretNotes.map((n) =>
      n.id === id ? { ...n, isFavorite: !n.isFavorite, updatedAt: Date.now() } : n
    );
    setSecretNotes(nextList);
    DB.setSecretYearNotes(nextList).then(() => syncManager.schedulePush());
  };

  // (2026-07-13) Immediate optimistic state update for digital love letters
  const handleSaveDigitalLetter = (letter: DigitalLoveLetter) => {
    const exists = digitalLoveLetters.some((l) => l.id === letter.id);
    const nextList = exists
      ? digitalLoveLetters.map((l) => (l.id === letter.id ? letter : l))
      : [letter, ...digitalLoveLetters];
    setDigitalLoveLetters(nextList);
    DB.setDigitalLoveLetters(nextList).then(() => syncManager.schedulePush());
  };

  const handleDeleteDigitalLetter = (id: string) => {
    const nextList = digitalLoveLetters.filter((l) => l.id !== id);
    setDigitalLoveLetters(nextList);
    DB.setDigitalLoveLetters(nextList).then(() => syncManager.schedulePush());
  };

  const handleUpdateProfile = async (nextProfile: CoupleProfile) => {
    await DB.setCoupleProfile(nextProfile);
    syncManager.schedulePush();
  };

  const handleUpdateTimeCapsule = async (nextCapsule: TimeCapsuleItem) => {
    await DB.setTimeCapsule(nextCapsule);
    syncManager.schedulePush();
  };

  const activeMemory =
    memories.find((m) => m.id === selectedMemoryId) || memories[0];

  // (2026-07-13) Add notepad subtitle mapping; was missing notepad record key
  const tabSubtitle: Record<ActiveTab, string> = {
    timeline: 'Timeline',
    story: 'Story',
    'new-date': editingMemory ? 'Edit Memory' : 'New Date',
    capsule: 'Capsule',
    letters: `For ${profile.partner2Name}`,
    notepad: 'Monthly Notepad',
  };

  // (2026-07-13) Guard sanctuary with PIN 7777 screen; was unguarded
  if (!isPinUnlocked) {
    return <PinLockModal onUnlock={() => setIsPinUnlocked(true)} />;
  }

  // (2026-07-13) Render full-page /backup settings & daily backups vs 404
  if (location.pathname === '/backup') {
    return (
      <>
        <BackupVaultPage
          profile={profile}
          memories={memories}
          secretNotes={secretNotes}
          digitalLoveLetters={digitalLoveLetters}
          timeCapsule={timeCapsule}
          dailyBackups={dailyBackups}
          onUpdateProfile={handleUpdateProfile}
          onResetToCleanSlate={async () => {
            await DB.resetToCleanSlate();
            syncManager.schedulePush();
          }}
          onRestoreShowcaseArchive={async () => {
            await DB.restoreShowcaseArchive();
            syncManager.schedulePush();
          }}
          onTriggerSkeletonReload={triggerInAppRefresh}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen relative flex flex-col bg-background text-on-surface"
    >
      {/* Subtle Paper Dot Texture Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#4a3b32_1px,transparent_1px)] [background-size:20px_20px] z-0" />

      {/* (2026-07-13) Add subtle pet doodle background; was dot pattern only */}
      <div id="subtle-pet-drawings-bg" className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* Subtle decorative pet doodles */}
        {/* Sleeping curled cat */}
        <svg aria-hidden="true" className="absolute top-10 right-4 md:right-16 w-32 h-32 md:w-44 md:h-44 text-primary opacity-[0.04] rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="50" cy="58" rx="28" ry="22" />
          <circle cx="68" cy="42" r="14" />
          <path d="M62 30 L66 22 L72 30" />
          <path d="M74 31 L80 25 L82 35" />
          <path d="M64 42 Q68 45 72 42" />
          <path d="M72 46 Q74 48 76 46" />
          <path d="M58 43 L48 41 M58 46 L46 47 M76 43 L86 42 M76 46 L86 48" />
          <path d="M22 62 Q18 42 32 36 Q38 34 36 44" />
        </svg>

        {/* Happy floppy-eared puppy */}
        <svg aria-hidden="true" className="absolute bottom-24 left-4 md:left-80 w-36 h-36 md:w-48 md:h-48 text-primary opacity-[0.04] -rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="50" cy="62" rx="24" ry="20" />
          <circle cx="50" cy="38" r="16" />
          <path d="M36 32 C28 34 26 46 32 50 C36 52 38 46 36 38" />
          <path d="M64 32 C72 34 74 46 68 50 C64 52 62 46 64 38" />
          <circle cx="44" cy="36" r="1.5" fill="currentColor" />
          <circle cx="56" cy="36" r="1.5" fill="currentColor" />
          <ellipse cx="50" cy="42" rx="3.5" ry="2.5" fill="currentColor" />
          <path d="M47 44 Q50 48 53 44" />
          <path d="M72 66 Q84 62 82 50" />
          <path d="M40 78 Q42 84 46 84 M54 84 Q58 84 60 78" />
        </svg>

        {/* Playful stretching cat on tablet & desktop */}
        <svg aria-hidden="true" className="hidden md:block absolute top-1/2 right-12 w-40 h-40 text-primary opacity-[0.035] -rotate-12" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 75 Q35 70 48 55 Q58 42 75 42" />
          <circle cx="78" cy="40" r="10" />
          <path d="M74 31 L77 24 L82 32 M82 33 L88 26 L88 35" />
          <path d="M20 75 L14 77 M24 75 L20 80 M52 75 L54 82 M60 72 L64 80" />
          <path d="M18 75 Q12 50 16 38 Q20 30 26 34" />
        </svg>

        {/* Delicate paw prints trail */}
        <div className="absolute top-28 left-6 md:left-88 flex flex-col gap-4 text-primary opacity-[0.035] rotate-12">
          <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <ellipse cx="12" cy="15" rx="5" ry="4" />
            <circle cx="6" cy="9" r="2" />
            <circle cx="10" cy="6" r="2" />
            <circle cx="14" cy="6" r="2" />
            <circle cx="18" cy="9" r="2" />
          </svg>
          <svg aria-hidden="true" className="w-4 h-4 ml-3" viewBox="0 0 24 24" fill="currentColor">
            <ellipse cx="12" cy="15" rx="5" ry="4" />
            <circle cx="6" cy="9" r="2" />
            <circle cx="10" cy="6" r="2" />
            <circle cx="14" cy="6" r="2" />
            <circle cx="18" cy="9" r="2" />
          </svg>
        </div>

        <div className="absolute bottom-40 right-8 md:right-32 flex flex-col gap-4 text-primary opacity-[0.03] -rotate-45">
          <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <ellipse cx="12" cy="15" rx="5" ry="4" />
            <circle cx="6" cy="9" r="2" />
            <circle cx="10" cy="6" r="2" />
            <circle cx="14" cy="6" r="2" />
            <circle cx="18" cy="9" r="2" />
          </svg>
          <svg aria-hidden="true" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <ellipse cx="12" cy="15" rx="5" ry="4" />
            <circle cx="6" cy="9" r="2" />
            <circle cx="10" cy="6" r="2" />
            <circle cx="14" cy="6" r="2" />
            <circle cx="18" cy="9" r="2" />
          </svg>
        </div>
      </div>

      {/* Custom In-App Pull-to-Refresh Indicator */}
      {pullOffset > 8 && (
        <div
          style={{ height: `${pullOffset}px` }}
          className="w-full flex items-center justify-center overflow-hidden bg-surface-container-low/70 z-40 transition-all"
        >
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* (2026-07-13) Add responsive left sidebar for tablet/desktop vs mobile only */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 fixed inset-y-0 left-0 z-40 bg-surface-bright/98 backdrop-blur-md border-r border-outline-variant/30 p-5 justify-between no-print overflow-y-auto">
        <div className="flex flex-col gap-6">
          <div
            onClick={() => requestTabNavigation('timeline')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              alt="Capybara Wax Seal Monogram"
              className="h-10 w-10 object-contain shrink-0 group-hover:scale-105 transition-transform"
              src={CAPYBARA_SEAL_LOGO}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-primary tracking-normal leading-tight font-serif truncate">
                Our Keepsake
              </span>
              <span className="font-label-md text-label-md uppercase tracking-wider text-secondary truncate">
                For {profile.partner2Name} • {profile.partner1Name} &amp; {profile.partner2Name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecordNewDateClick}
            className={`w-full py-3 px-4 rounded-xl font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 ${
              activeTab === 'new-date'
                ? 'bg-primary text-on-primary ring-2 ring-primary-container'
                : 'bg-gradient-to-r from-secondary to-primary text-surface-bright hover:shadow-md'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Record New Date</span>
          </button>

          <nav className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => requestTabNavigation('timeline')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-label-md text-label-md tracking-wide transition-all ${
                activeTab === 'timeline'
                  ? 'bg-secondary-container/70 text-on-secondary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px]">auto_stories</span>
                <span>Timeline</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high/60 text-secondary">
                {memories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => requestTabNavigation('story')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-label-md text-label-md tracking-wide transition-all ${
                activeTab === 'story'
                  ? 'bg-secondary-container/70 text-on-secondary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px]">menu_book</span>
                <span>Story Reader</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => requestTabNavigation('capsule')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-label-md text-label-md tracking-wide transition-all ${
                activeTab === 'capsule'
                  ? 'bg-secondary-container/70 text-on-secondary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                <span>Time Capsule</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => requestTabNavigation('letters')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-label-md text-label-md tracking-wide transition-all ${
                activeTab === 'letters'
                  ? 'bg-secondary-container/70 text-on-secondary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px]">mail</span>
                <span>Love Letters</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high/60 text-secondary">
                {digitalLoveLetters.length + secretNotes.length}
              </span>
            </button>

            {/* (2026-07-13) Add Monthly Notepads button in sidebar; was absent from nav */}
            <button
              type="button"
              onClick={() => requestTabNavigation('notepad')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-label-md text-label-md tracking-wide transition-all ${
                activeTab === 'notepad'
                  ? 'bg-secondary-container/70 text-on-secondary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px]">sticky_note_2</span>
                <span>Monthly Notepads</span>
              </div>
            </button>

            <div className="my-2 border-t border-outline-variant/25" />

            <button
              type="button"
              onClick={() => requestRouteNavigation('/backup')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-label-md text-label-md tracking-wide text-secondary hover:bg-surface-container-low hover:text-primary transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">folder_zip</span>
                <span>Vault &amp; Backups</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary-container/50 text-secondary uppercase tracking-widest font-bold">
                /backup
              </span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-outline-variant/30 flex flex-col gap-3">
          <div
            onClick={() => navigate('/backup')}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors"
          >
            {/* (2026-07-13) Render bundled avatar asset with fallback; was literal path */}
            <img
              alt="Couple Profile"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-tertiary-fixed-dim shrink-0"
              src={getAvatarSrc(profile.avatarUrl)}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== COUPLE_AVATAR_URL) {
                  target.src = COUPLE_AVATAR_URL;
                } else {
                  target.onerror = null;
                }
              }}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-bold text-primary truncate">
                {profile.partner1Name} &amp; {profile.partner2Name}
              </span>
              {/* (2026-07-13) Show courting stage vs premature anniversary date */}
              <span className="text-[11px] text-on-surface-variant truncate">
                {profile.anniversaryDateISO
                  ? `Since ${formatStandardDate(profile.anniversaryDateISO)}`
                  : `Courting Since ${formatStandardDate(profile.courtingDateISO || '2025-11-07')}`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] px-2 text-secondary font-label-md">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cloud Sync Active</span>
            </div>
            <button
              type="button"
              onClick={triggerInAppRefresh}
              title="Refresh Vault Data"
              className="hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          </div>
        </div>
      </aside>

      {/* (2026-07-13) Render story actions directly in mobile header; was double bar */}
      <header className="md:hidden fixed top-0 w-full z-50 pt-safe frosted-glass-bar border-b border-outline-variant/25 shadow-[0_2px_12px_rgba(74,59,50,0.05)] no-print">
        {activeTab === 'story' && activeMemory ? (
          // (2026-07-13) Compact header height to reduce top blank space; was h-16
          <div className="h-14 px-gutter max-w-[760px] mx-auto flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                navigate('/');
                switchTab('timeline');
              }}
              aria-label="Return to timeline"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high/90 text-primary border border-outline-variant/30 text-[13px] font-medium shadow-sm hover:bg-surface-variant transition-colors active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Timeline</span>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/date/${activeMemory.dateISO}`;
                  navigator.clipboard
                    .writeText(url)
                    .then(() => {
                      addToast(`Link copied: /date/${activeMemory.dateISO}`, 'info');
                    })
                    .catch(() => {
                      addToast(`/date/${activeMemory.dateISO}`, 'info');
                    });
                }}
                title="Copy direct link for this date"
                className="w-9 h-9 rounded-full bg-surface-container-low text-secondary hover:text-primary flex items-center justify-center border border-outline-variant/35 shadow-xs active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">link</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartEditMemory(activeMemory)}
                className="px-3.5 py-2 rounded-full bg-surface-container-low text-primary hover:bg-surface-container font-label-md text-xs uppercase tracking-wider flex items-center gap-1.5 border border-outline-variant/35 shadow-xs active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setStoryHeaderDeleteConfirmOpen(true)}
                title="Delete memory"
                className="w-9 h-9 rounded-full bg-surface-container-low text-error hover:bg-error/10 flex items-center justify-center border border-outline-variant/35 shadow-xs active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ) : (
          // (2026-07-13) Compact header height to reduce top blank space; was h-16
          <div className="h-14 px-gutter max-w-[760px] mx-auto flex items-center justify-between">
          <div
            onClick={() => requestTabNavigation('timeline')}
            className="flex items-center gap-space-sm cursor-pointer"
          >
            {/* (2026-07-13) Universal back closes all open modals or navigates to timeline */}
            {(activeTab !== 'timeline' || openModalsCount > 0) && (
              <button
                type="button"
                aria-label="Universal Back Button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUniversalBack();
                }}
                className="w-8 h-8 -ml-1 mr-1 rounded-full flex items-center justify-center text-primary active:scale-95"
              >
                <span className="material-symbols-outlined text-[19px]">
                  arrow_back_ios_new
                </span>
              </button>
            )}
            {/* (2026-07-13) Fix header logo size and spacing vs squeezed broken img */}
            <img
              alt="Capybara Wax Seal Monogram"
              className="h-8 w-8 object-contain shrink-0"
              src={CAPYBARA_SEAL_LOGO}
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary tracking-normal leading-tight font-serif">
                Our Keepsake
              </span>
              <span className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                {tabSubtitle[activeTab]} • {profile.partner1Name} &amp; {profile.partner2Name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick /backup Route Link Button */}
            <button
              type="button"
              aria-label="Open /backup vault"
              title="Open /backup Vault"
              onClick={() => requestRouteNavigation('/backup')}
              className="px-2.5 h-9 rounded-full bg-surface-container-low flex items-center justify-center gap-1 text-secondary hover:text-primary transition-colors active:scale-95 font-label-md text-[10px] uppercase tracking-wider border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">folder_zip</span>
              <span className="hidden sm:inline">/backup</span>
            </button>

            {/* Quick Search Jump Button */}
            <button
              type="button"
              aria-label="Search memories"
              onClick={() => {
                requestTabNavigation('timeline');
                setTimeout(() => {
                  const el = document.getElementById('keepsake-search-section');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  const input = el?.querySelector('input');
                  input?.focus();
                }, 120);
              }}
              className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[19px]">search</span>
            </button>

            {/* In-App Refresh Button */}
            <button
              type="button"
              aria-label="Refresh keepsake ledger"
              onClick={triggerInAppRefresh}
              className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-95"
            >
              <span
                className={`material-symbols-outlined text-[19px] ${
                  isSkeletonRefreshing ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
            </button>

            {/* (2026-07-13) Route profile button directly to /backup vs modal popup */}
            <button
              type="button"
              onClick={() => navigate('/backup')}
              aria-label="Loving Couple Profile & Backup Studio"
              className="p-0.5 rounded-full ring-1 ring-tertiary-fixed-dim/70 shadow-sm transition-transform active:scale-95"
            >
              {/* (2026-07-13) Render bundled avatar asset with fallback; was literal path */}
              <img
                alt="Couple Profile"
                className="w-8 h-8 rounded-full object-cover"
                src={getAvatarSrc(profile.avatarUrl)}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== COUPLE_AVATAR_URL) {
                    target.src = COUPLE_AVATAR_URL;
                  } else {
                    target.onerror = null;
                  }
                }}
              />
            </button>
          </div>
        </div>
        )}
      </header>

      {/* Main Content Area with Exact-Position Shimmering Skeleton Loaders */}
      {/* (2026-07-13) Fix top/bottom insets & blank space; was pt-20 pb-28 */}
      <main className="flex flex-col relative w-full md:pl-64 lg:pl-72 pt-[calc(3.75rem+env(safe-area-inset-top,0px))] md:pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-10 bg-transparent z-10 flex-1 min-w-0">
        {isHydrating || isSkeletonRefreshing ? (
          <div className="flex flex-col w-full px-margin pb-space-xl max-w-[760px] mx-auto gap-space-lg">
            <div className="flex flex-col items-center gap-2 mt-2">
              <div className="w-40 h-6 rounded-full skeleton-shimmer" />
              <div className="w-64 h-9 rounded-xl skeleton-shimmer" />
              <div className="w-full h-16 rounded-xl skeleton-shimmer mt-2" />
            </div>
            <div className="w-full h-64 rounded-xl skeleton-shimmer" />
            <div className="w-full h-72 rounded-xl skeleton-shimmer" />
          </div>
        ) : (
          <>
            {activeTab === 'timeline' && (
              <TimelineView
                profile={profile}
                memories={memories}
                secretNotes={secretNotes}
                digitalLoveLetters={digitalLoveLetters}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenMemory={handleOpenMemory}
                onEditMemory={handleStartEditMemory}
                onReorderMemories={handleReorderMemories}
                onOpenSecretNotesTab={() => switchTab('letters')}
                onOpenProfileModal={() => navigate('/backup')}
                // (2026-07-13) Open notepad on active calendar month; was default month
                onOpenMonthlyNotepad={(year?: number, month?: number) => {
                  if (typeof year === 'number' && typeof month === 'number') {
                    setNotepadTarget({ year, month });
                  }
                  switchTab('notepad');
                }}
                // (2026-07-13) Pass handleSaveMemory to TimelineView; was omitted
                // (2026-07-13) Pass delete, note, toast & overlay reopen props to TimelineView
                onSaveMemory={handleSaveMemory}
                onDeleteMemory={handleDeleteMemory}
                onAddPartnerNote={handleAddPartnerNote}
                onUpdateMemoryDots={handleUpdateMemoryDots}
                onUpdateMemoryPhotos={handleUpdateMemoryPhotos}
                onToast={addToast}
                initialOpenDateISO={pendingOverlayDateISO}
                onConsumedOpenDate={() => setPendingOverlayDateISO(null)}
              />
            )}

            {activeTab === 'story' &&
              (activeMemory ? (
                // (2026-07-13) Dynamic key for instant updates on memory edit; was stale state
                <StoryReaderView
                  key={`${activeMemory.id}-${activeMemory.updatedAt}`}
                  profile={profile}
                  memory={activeMemory}
                  allMemories={memories}
                  // (2026-07-13) Pass digitalLoveLetters to StoryReader; was omitted
                  digitalLoveLetters={digitalLoveLetters}
                  onSelectMemory={(id) => {
                    setSelectedMemoryId(id);
                    DB.setSelectedMemoryId(id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBackToTimeline={() => {
                    navigate('/');
                    switchTab('timeline');
                  }}
                  onEditMemory={handleStartEditMemory}
                  onDeleteMemory={handleDeleteMemory}
                  onAddPartnerNote={handleAddPartnerNote}
                  onUpdateMemoryDots={handleUpdateMemoryDots}
                  onUpdateMemoryPhotos={handleUpdateMemoryPhotos}
                  onToast={addToast}
                />
              ) : (
                <div className="max-w-[760px] mx-auto px-margin pt-6">
                  <div className="bg-surface-container-lowest rounded-2xl p-8 text-center shadow-sm border border-outline-variant/35 flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-[32px] text-secondary">
                      menu_book
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                      No Sealed Date Envelopes Yet
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                      Your Story Reader is currently on a clean slate. Tap the + button below to
                      write your first date memory for {profile.partner2Name}, or visit /backup to
                      restore your backed-up archive.
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => switchTab('new-date')}
                        className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider"
                      >
                        Write First Memory
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/backup')}
                        className="px-4 py-2 rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider border border-outline-variant/40"
                      >
                        Go to /backup
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {activeTab === 'new-date' && (
              // (2026-07-13) Connect onDirtyChange and safe tab cancel; was immediate
              // (2026-07-13) Pass existingMemories to disallow duplicate dates; was absent
              <ComposerView
                key={editingMemory?.id || 'new-composer'}
                profile={profile}
                editingMemory={editingMemory}
                existingMemories={memories}
                totalMemoriesCount={memories.length}
                onSaveMemory={handleSaveMemory}
                onCancel={() => requestTabNavigation('timeline')}
                onToast={addToast}
                onDirtyChange={setHasUnsavedChanges}
              />
            )}

            {activeTab === 'capsule' && (
              <CapsuleVaultView
                profile={profile}
                memories={memories}
                timeCapsule={timeCapsule}
                onUpdateTimeCapsule={handleUpdateTimeCapsule}
                onToggleAudioFavorite={handleToggleAudioFavorite}
                onOpenMemory={handleOpenMemory}
                onToast={addToast}
              />
            )}

            {activeTab === 'letters' && (
              <SecretYearLettersView
                profile={profile}
                secretNotes={secretNotes}
                digitalLoveLetters={digitalLoveLetters}
                onSaveSecretNote={handleSaveSecretNote}
                onDeleteSecretNote={handleDeleteSecretNote}
                onToggleFavoriteNote={handleToggleFavoriteSecretNote}
                onSaveDigitalLetter={handleSaveDigitalLetter}
                onDeleteDigitalLetter={handleDeleteDigitalLetter}
                onToast={addToast}
              />
            )}

            {/* (2026-07-13) Pass initialYear & initialMonth to notepad; was omitted */}
            {activeTab === 'notepad' && (
              <MonthlyNotepadView
                profile={profile}
                memories={memories}
                initialYear={notepadTarget?.year}
                initialMonth={notepadTarget?.month}
                onBackToTimeline={() => switchTab('timeline')}
                onToast={addToast}
                onUpdateMemoriesLive={handleUpdateMemoriesFromNotepad}
              />
            )}
          </>
        )}
      </main>

      {/* Global Toast Container above Bottom Navigation */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* (2026-07-13) Hide bottom nav when mobile keyboard is open; was always shown */}
      <nav
        className={`md:hidden fixed bottom-0 w-full z-50 pb-safe frosted-glass-bar border-t border-outline-variant/35 rounded-t-2xl shadow-[0_-6px_24px_rgba(51,37,29,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] no-print transition-transform duration-200 ${
          isKeyboardOpen ? 'hidden translate-y-full pointer-events-none' : 'translate-y-0'
        }`}
      >
        <div className="h-14 px-gutter max-w-[760px] mx-auto flex items-center justify-around">
          <button
            type="button"
            onClick={() => requestTabNavigation('timeline')}
            className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] gap-0.5 transition-colors ${
              activeTab === 'timeline'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">auto_stories</span>
            <span className="font-label-md text-[11px] tracking-wider">Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => requestTabNavigation('story')}
            className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] gap-0.5 transition-colors ${
              activeTab === 'story'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">menu_book</span>
            <span className="font-label-md text-[11px] tracking-wider">Story</span>
          </button>

          <div className="flex items-center justify-center -mt-5">
            <button
              type="button"
              aria-label="Record New Date Memory"
              onClick={handleRecordNewDateClick}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-secondary to-primary-container text-surface-bright flex items-center justify-center shadow-[0_6px_14px_-3px_rgba(74,59,50,0.28)] ring-2 ring-tertiary-fixed/80 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[26px]">add</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => requestTabNavigation('letters')}
            className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] gap-0.5 transition-colors relative ${
              activeTab === 'letters' || activeTab === 'capsule'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">mail</span>
            <span className="font-label-md text-[11px] tracking-wider">Letters</span>
          </button>

          <button
            type="button"
            onClick={() => requestTabNavigation('notepad')}
            className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] gap-0.5 transition-colors ${
              activeTab === 'notepad'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">edit_note</span>
            <span className="font-label-md text-[11px] tracking-wider">Notepad</span>
          </button>
        </div>
      </nav>

      {/* (2026-07-13) Modal asking to discard unsaved changes; was silent leave */}
      {showUnsavedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in"
        >
          <div
            id="unsaved-changes-dialog"
            className="w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-outline-variant/35 p-6 shadow-xl flex flex-col items-center text-center gap-4 animate-scale-up"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">edit_note</span>
            </div>

            <div>
              <h3
                id="unsaved-modal-title"
                className="font-headline-sm text-lg sm:text-xl font-serif text-primary font-bold"
              >
                Unsaved Changes
              </h3>
              <p className="font-body-sm text-sm text-secondary mt-1.5 leading-relaxed font-sans">
                You have unsaved changes in this keepsake chapter. Navigating to another tab will discard your unsealed memories.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-1">
              <button
                type="button"
                onClick={handleCancelDiscard}
                className="w-full py-2.5 px-4 rounded-xl border border-outline-variant/40 bg-surface-container-low text-primary font-sans font-semibold text-xs uppercase tracking-wider hover:bg-surface-container transition-colors active:scale-98"
              >
                Keep Writing
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-sans font-semibold text-xs uppercase tracking-wider hover:bg-primary/95 shadow-sm transition-colors active:scale-98"
              >
                Discard &amp; Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (2026-07-13) Delete confirm modal for Story mobile header; was in child */}
      {storyHeaderDeleteConfirmOpen && activeMemory && (
        <div
          className="fixed inset-0 z-[150] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setStoryHeaderDeleteConfirmOpen(false)}
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
              Are you sure you want to remove &ldquo;{activeMemory.title}&rdquo; from your shared archive?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStoryHeaderDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-secondary font-label-md text-label-md uppercase"
              >
                Keep Memory
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = activeMemory.id;
                  setStoryHeaderDeleteConfirmOpen(false);
                  handleDeleteMemory(id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md uppercase shadow-md"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Couple Studio & Backup/Restore Modal */}
      {studioModalOpen && (
        <CoupleStudioModal
          profile={profile}
          onClose={() => setStudioModalOpen(false)}
          onUpdateProfile={handleUpdateProfile}
          onTriggerSkeletonReload={triggerInAppRefresh}
          onToast={addToast}
        />
      )}
    </div>
  );
};
