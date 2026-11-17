// (2026-07-13) Add React Router /backup route & clean-slate handlers vs single view
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ActiveTab,
  CoupleProfile,
  DailyBackupRecord,
  DigitalLoveLetter,
  KeepsakeMemory,
  SecretYearNote,
  TimeCapsuleItem,
} from './types';
import { CAPYBARA_SEAL_LOGO } from './data/seedMemories';
import { DB } from './db/localDb';
import { syncManager } from './db/firebaseSync';
import { TimelineView } from './views/TimelineView';
import { StoryReaderView } from './views/StoryReaderView';
import { ComposerView } from './views/ComposerView';
import { CapsuleVaultView } from './views/CapsuleVaultView';
import { SecretYearLettersView } from './views/SecretYearLettersView';
import { BackupVaultPage } from './views/BackupVaultPage';
import { ToastContainer, ToastItem } from './components/ToastContainer';
import { CoupleStudioModal } from './components/CoupleStudioModal';

export const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSkeletonRefreshing, setIsSkeletonRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => DB.getActiveTab());
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>(() =>
    DB.getSelectedMemoryId()
  );
  const [editingMemory, setEditingMemory] = useState<KeepsakeMemory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [studioModalOpen, setStudioModalOpen] = useState(false);

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

  const addToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' | 'danger' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3400);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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

  // Persist active tab & selected memory in localStorage
  const switchTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    DB.setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Hierarchical Back-Button & Two-Step Exit Flow per SKILL.md Section 2 Rules 8 & 16
  useEffect(() => {
    window.history.pushState({ keepsakeGuard: true }, '');
    const handlePopState = () => {
      window.history.pushState({ keepsakeGuard: true }, '');
      if (studioModalOpen) {
        setStudioModalOpen(false);
        return;
      }
      if (activeTab !== 'timeline') {
        setEditingMemory(null);
        switchTab('timeline');
        return;
      }
      const now = Date.now();
      if (now - lastBackPressRef.current < 2500) {
        addToast('Keepsake Vault minimized.', 'info');
      } else {
        lastBackPressRef.current = now;
        addToast('Press back again to exit.', 'warning');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && studioModalOpen) {
        setStudioModalOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, studioModalOpen, switchTab, addToast]);

  const triggerInAppRefresh = useCallback(() => {
    setIsSkeletonRefreshing(true);
    syncManager.pullSnapshot();
    setTimeout(() => {
      setIsSkeletonRefreshing(false);
      addToast('Keepsake ledger synchronized.', 'info');
    }, 650);
  }, [addToast]);

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

  // CRUD handlers with Optimistic UI Updates + Background Cloud Sync
  const handleOpenMemory = (id: string) => {
    setSelectedMemoryId(id);
    DB.setSelectedMemoryId(id);
    switchTab('story');
  };

  const handleStartEditMemory = (memory: KeepsakeMemory) => {
    setEditingMemory(memory);
    switchTab('new-date');
  };

  const handleSaveMemory = async (memory: KeepsakeMemory, isDraft: boolean) => {
    const exists = memories.some((m) => m.id === memory.id);
    const nextList = exists
      ? memories.map((m) => (m.id === memory.id ? memory : m))
      : [memory, ...memories];

    await DB.setMemories(nextList);
    syncManager.schedulePush();
    setEditingMemory(null);
    setSelectedMemoryId(memory.id);
    DB.setSelectedMemoryId(memory.id);

    if (isDraft) {
      addToast(`Draft "${memory.title}" saved to your desk.`, 'info');
      switchTab('timeline');
    } else {
      addToast(`"${memory.title}" sealed into your Memory Box!`, 'success');
      switchTab('story');
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

  const handleSaveSecretNote = async (note: SecretYearNote) => {
    const exists = secretNotes.some((n) => n.id === note.id);
    const nextList = exists
      ? secretNotes.map((n) => (n.id === note.id ? note : n))
      : [note, ...secretNotes];
    await DB.setSecretYearNotes(nextList);
    syncManager.schedulePush();
  };

  const handleDeleteSecretNote = async (id: string) => {
    const nextList = secretNotes.filter((n) => n.id !== id);
    await DB.setSecretYearNotes(nextList);
    syncManager.schedulePush();
  };

  const handleToggleFavoriteSecretNote = async (id: string) => {
    const nextList = secretNotes.map((n) =>
      n.id === id ? { ...n, isFavorite: !n.isFavorite, updatedAt: Date.now() } : n
    );
    await DB.setSecretYearNotes(nextList);
    syncManager.schedulePush();
  };

  // (2026-07-13) Add handlers for digital love letters vs missing handlers
  const handleSaveDigitalLetter = async (letter: DigitalLoveLetter) => {
    const exists = digitalLoveLetters.some((l) => l.id === letter.id);
    const nextList = exists
      ? digitalLoveLetters.map((l) => (l.id === letter.id ? letter : l))
      : [letter, ...digitalLoveLetters];
    await DB.setDigitalLoveLetters(nextList);
    syncManager.schedulePush();
  };

  const handleDeleteDigitalLetter = async (id: string) => {
    const nextList = digitalLoveLetters.filter((l) => l.id !== id);
    await DB.setDigitalLoveLetters(nextList);
    syncManager.schedulePush();
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

  const tabSubtitle: Record<ActiveTab, string> = {
    timeline: 'Timeline',
    story: 'Story',
    'new-date': editingMemory ? 'Edit Memory' : 'New Date',
    capsule: 'Capsule',
    letters: `For ${profile.partner2Name}`,
  };

  // (2026-07-13) Render full-page /backup settings & daily Firestore backups
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

  // (2026-07-13) Render full-page /backup settings & daily Firestore backups
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

      {/* Custom In-App Pull-to-Refresh Indicator */}
      {pullOffset > 8 && (
        <div
          style={{ height: `${pullOffset}px` }}
          className="w-full flex items-center justify-center overflow-hidden bg-surface-container-low/70 z-40 transition-all"
        >
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* Top Sticky Stationery Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface-bright/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(74,59,50,0.04)] no-print">
        <div className="h-16 px-gutter max-w-[760px] mx-auto flex items-center justify-between">
          <div
            onClick={() => {
              setEditingMemory(null);
              switchTab('timeline');
            }}
            className="flex items-center gap-space-sm cursor-pointer"
          >
            {activeTab !== 'timeline' && (
              <button
                type="button"
                aria-label="Go back to timeline"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMemory(null);
                  switchTab('timeline');
                }}
                className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center text-primary active:scale-95"
              >
                <span className="material-symbols-outlined text-[19px]">
                  arrow_back_ios_new
                </span>
              </button>
            )}
            <img
              alt="Capybara Wax Seal Monogram"
              className="h-8 w-auto object-contain"
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
              onClick={() => navigate('/backup')}
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
                switchTab('timeline');
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
              <img
                alt="Couple Profile"
                className="w-8 h-8 rounded-full object-cover"
                src={profile.avatarUrl}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with Exact-Position Shimmering Skeleton Loaders */}
      <main className="flex flex-col relative w-full pt-20 pb-28 bg-transparent z-10 flex-1">
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
              />
            )}

            {activeTab === 'story' &&
              (activeMemory ? (
                <StoryReaderView
                  profile={profile}
                  memory={activeMemory}
                  allMemories={memories}
                  onSelectMemory={(id) => {
                    setSelectedMemoryId(id);
                    DB.setSelectedMemoryId(id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBackToTimeline={() => switchTab('timeline')}
                  onEditMemory={handleStartEditMemory}
                  onDeleteMemory={handleDeleteMemory}
                  onAddPartnerNote={handleAddPartnerNote}
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
              <ComposerView
                profile={profile}
                editingMemory={editingMemory}
                totalMemoriesCount={memories.length}
                onSaveMemory={handleSaveMemory}
                onCancel={() => {
                  setEditingMemory(null);
                  switchTab('timeline');
                }}
                onToast={addToast}
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
          </>
        )}
      </main>

      {/* Global Toast Container above Bottom Navigation */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Bottom Navigation Bar matching Stitch Design */}
      // (2026-07-13) Fix navbar arch & contrast vs rounded-t-full dome
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-bright/95 backdrop-blur-xl border-t border-outline-variant/30 rounded-t-2xl shadow-[0_-4px_20px_rgba(74,59,50,0.08)] no-print">
        <div className="h-16 px-gutter max-w-[760px] mx-auto flex items-center justify-around">
          <button
            type="button"
            onClick={() => {
              setEditingMemory(null);
              switchTab('timeline');
            }}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] gap-0.5 transition-colors ${
              activeTab === 'timeline'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">auto_stories</span>
            <span className="font-label-md text-label-md tracking-wider">Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingMemory(null);
              switchTab('story');
            }}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] gap-0.5 transition-colors ${
              activeTab === 'story'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">menu_book</span>
            <span className="font-label-md text-label-md tracking-wider">Story</span>
          </button>

          <div className="flex items-center justify-center -mt-5">
            <button
              type="button"
              aria-label="Record New Date Memory"
              onClick={() => {
                setEditingMemory(null);
                switchTab('new-date');
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-secondary to-primary-container text-surface-bright flex items-center justify-center shadow-[0_6px_14px_-3px_rgba(74,59,50,0.28)] ring-2 ring-tertiary-fixed/80 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[26px]">add</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingMemory(null);
              switchTab('capsule');
            }}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] gap-0.5 transition-colors ${
              activeTab === 'capsule'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            <span className="font-label-md text-label-md tracking-wider">Capsule</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingMemory(null);
              switchTab('letters');
            }}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] gap-0.5 transition-colors relative ${
              activeTab === 'letters'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">mail</span>
            <span className="font-label-md text-label-md tracking-wider">Letters</span>
          </button>
        </div>
      </nav>

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
