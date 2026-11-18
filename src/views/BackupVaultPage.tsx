// (2026-07-13) Build full-page /backup Settings & Daily Firestore Backups view
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BackupSnapshot,
  CoupleProfile,
  DailyBackupRecord,
  DigitalLoveLetter,
  FirebaseRuntimeConfig,
  KeepsakeMemory,
  SecretYearNote,
  TimeCapsuleItem,
} from '../types';
// (2026-07-13) Remove sample seed imports vs hardcoded showcase arrays
import {
  CAPYBARA_SEAL_LOGO,
} from '../data/seedMemories';
import {
  DB,
  exportBothJSONandCSV,
  exportCSVSnapshot,
  exportJSONSnapshot,
} from '../db/localDb';
import { syncManager } from '../db/firebaseSync';
import { formatStandardDate } from '../utils/dateFormat';

interface BackupVaultPageProps {
  profile: CoupleProfile;
  memories: KeepsakeMemory[];
  secretNotes: SecretYearNote[];
  digitalLoveLetters: DigitalLoveLetter[];
  timeCapsule: TimeCapsuleItem;
  dailyBackups: DailyBackupRecord[];
  onUpdateProfile: (next: CoupleProfile) => Promise<void>;
  onResetToCleanSlate: () => Promise<void>;
  onRestoreShowcaseArchive: () => Promise<void>;
  onTriggerSkeletonReload: () => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
}

export const BackupVaultPage: React.FC<BackupVaultPageProps> = ({
  profile,
  memories,
  secretNotes,
  digitalLoveLetters,
  timeCapsule,
  dailyBackups,
  onUpdateProfile,
  onResetToCleanSlate,
  onRestoreShowcaseArchive,
  onTriggerSkeletonReload,
  onToast,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Couple Sanctuary Settings Form State
  const [form, setForm] = useState<CoupleProfile>(profile);
  const [syncInfo, setSyncInfo] = useState(syncManager.getStatus());
  const [fbConfig, setFbConfig] = useState<FirebaseRuntimeConfig>(() =>
    syncManager.getRuntimeConfig()
  );
  const [showFbConfigDrawer, setShowFbConfigDrawer] = useState(false);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [previewSection, setPreviewSection] = useState<
    'DAILY_BACKUPS' | 'MEMORIES' | 'LETTERS' | 'SECRET_NOTES'
  >('DAILY_BACKUPS');

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  useEffect(() => {
    return syncManager.subscribe(() => {
      setSyncInfo(syncManager.getStatus());
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CoupleProfile = {
      ...form,
      partner1Name: form.partner1Name.trim() || 'JP',
      partner2Name: form.partner2Name.trim() || 'Zea',
      updatedAt: Date.now(),
    };
    await onUpdateProfile(updated);
    onToast('Sanctuary settings saved to IndexedDB & Firestore.', 'success');
  };

  const handleSaveFirebaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    const connected = await syncManager.saveRuntimeConfig(fbConfig);
    setIsBusy(false);
    setShowFbConfigDrawer(false);
    if (connected) {
      onToast(`Connected to Firebase Firestore project "${fbConfig.projectId}"!`, 'success');
    } else {
      onToast('Saved config locally. Add valid API Key & Project ID to connect cloud.', 'info');
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    const res = await syncManager.signInWithGoogle();
    setIsSigningIn(false);
    if (res.ok) {
      onToast(`Signed in as ${res.email || 'jp.and.zea@keepsake.love'}`, 'success');
      onTriggerSkeletonReload();
    } else if (res.cancelled) {
      onToast('Sign-in popup closed. You can retry anytime.', 'info');
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await new Promise((r) => setTimeout(r, 600));
    await syncManager.signOut();
    setIsLoggingOut(false);
    onToast('Signed out cleanly. Local keepsake vault remains safe.', 'info');
  };

  // (2026-07-13) Use DB.createManualDailyBackup with Firestore push vs raw save
  const handleCreateManualDailyBackup = async () => {
    setIsBusy(true);
    const record = await DB.createManualDailyBackup();
    const pushed = await syncManager.pushDailyBackupToFirestore(record);
    setIsBusy(false);
    onToast(
      pushed
        ? 'Manual daily backup created & synced to Firestore database!'
        : 'Manual daily backup created in Local Vault (ready for sync)!',
      'success'
    );
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value per SKILL.md Part 6 Rule 7
    e.target.value = '';
    if (!file) return;
    setIsBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupSnapshot;
      if (!parsed || (!Array.isArray(parsed.memories) && !parsed.coupleProfile)) {
        throw new Error('Invalid backup file');
      }
      await DB.restoreSnapshot(parsed);
      await DB.saveBackup(parsed);
      syncManager.schedulePush();
      onToast('Backup file imported and restored into your live journal!', 'success');
    } catch {
      onToast('Invalid JSON backup file.', 'danger');
    } finally {
      setIsBusy(false);
    }
  };

  const isCurrentlyBlankSlate =
    memories.length === 0 && secretNotes.length === 0 && digitalLoveLetters.length === 0;

  return (
    <div
      id="dedicated-backup-settings-page" // Full-page Settings & Firestore Daily Backups
      className="min-h-screen bg-background text-on-surface pb-24"
    >
      {/* Dedicated Logging-Out Spinner Modal per SKILL.md Rule 9 */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-xs w-full text-center modal-animate-in">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <h4 className="font-headline-sm text-headline-sm text-primary font-serif">
              Sealing Vault &amp; Logging Out...
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Preserving offline IndexedDB snapshots safely.
            </p>
          </div>
        </div>
      )}

      {/* Top Sticky Header */}
      {/* (2026-07-13) Fix responsive header wrap and clipping; was fixed h-16 */}
      <header className="sticky top-0 w-full z-40 bg-surface-bright/98 backdrop-blur-md border-b border-outline-variant/30">
        <div className="min-h-[3.75rem] py-2 px-margin max-w-[760px] mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* (2026-07-13) Set explicit 32px square dimensions on logo vs auto width */}
            <img
              src={CAPYBARA_SEAL_LOGO}
              alt="Capybara Wax Seal"
              className="h-8 w-8 object-contain shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-headline-sm text-sm sm:text-headline-sm text-primary font-serif leading-tight truncate">
                {form.partner1Name} &amp; {form.partner2Name} • Keepsake Sanctuary
              </h1>
              {/* (2026-07-13) Show courting stage in settings header; was hardcoded Sep 14 */}
              <span className="font-label-md text-[10px] uppercase tracking-wider text-secondary truncate block">
                {form.anniversaryDateISO
                  ? `Since ${formatStandardDate(form.anniversaryDateISO)} • Settings & Firestore Backups`
                  : `Courting Since Nov 7, 2025 • Settings & Firestore Backups`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="shrink-0 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs sm:text-label-md uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span className="hidden sm:inline">Back to </span>
            <span>Journal</span>
          </button>
        </div>
      </header>

      <div className="max-w-[760px] mx-auto px-margin pt-6 flex flex-col gap-6">
        {/* SECTION 1: COUPLE SANCTUARY SETTINGS & GOOGLE AUTH */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-md border border-outline-variant/35 flex flex-col gap-5">
          {/* (2026-07-13) Fix responsive card header wrap; was single row squeeze */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/25 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-xs shrink-0">
                <span
                  className="material-symbols-outlined text-[19px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-primary font-serif leading-tight">
                  Sanctuary Settings &amp; Cloud Sync
                </h2>
                <p className="font-label-md text-[10px] uppercase tracking-wider text-secondary">
                  Dedicated /backup Settings Page
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFbConfigDrawer((p) => !p)}
              className="self-start sm:self-auto shrink-0 px-3 py-1.5 rounded-xl bg-surface-container-low text-primary font-label-md text-[10px] uppercase tracking-wider border border-outline-variant/40 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px] text-secondary">key</span>
              <span>{showFbConfigDrawer ? 'Hide Firebase Keys' : 'Connect Firebase Keys'}</span>
            </button>
          </div>

          {/* Local-First & Cloud Sync Bar */}
          <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[19px] text-secondary">
                  cloud_sync
                </span>
                <span className="font-label-lg text-label-lg text-primary">
                  Local-First &amp; Cloud Sync
                </span>
              </div>
              {/* (2026-07-13) Display permission-denied status badge; was 3 statuses */}
              <span className={`px-2.5 py-0.5 rounded-full font-label-md text-[10px] uppercase tracking-wider ${
                syncInfo.status === 'permission-denied'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-secondary-container/70 text-on-secondary-container'
              }`}>
                {syncInfo.status === 'quota'
                  ? 'Quota Reached (Local)'
                  : syncInfo.status === 'permission-denied'
                    ? 'Firestore Rules Denied'
                    : syncInfo.status === 'cloud-live'
                      ? `Firestore Live (${syncInfo.projectId})`
                      : 'IndexedDB Ready'}
              </span>
            </div>

            {/* (2026-07-13) Banner explaining how to allow rules in Firebase console */}
            {syncInfo.status === 'permission-denied' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-xs font-body-sm flex flex-col gap-1">
                <span className="font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Firestore Security Rules Are Blocking Sync
                </span>
                <p>
                  To sync between your devices without Google sign-in, open Firebase Console &gt; Firestore Database &gt; Rules, and set:
                </p>
                <div className="bg-white/80 p-1.5 rounded font-mono text-[11px] text-red-900 border border-red-200">
                  allow read, write: if true;
                </div>
              </div>
            )}

            {syncInfo.userEmail ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate-single">
                  Signed in as <strong className="text-primary">{syncInfo.userEmail}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-container-high text-primary font-label-md text-label-md uppercase tracking-wider shrink-0"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">account_circle</span>
                  <span>
                    {isSigningIn ? 'Connecting Google Account...' : 'Sign in with Google (Optional)'}
                  </span>
                </button>
              </div>
            )}

            {/* (2026-07-13) Clarify PIN 7777 shared vault & lock button; was login only */}
            <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-secondary">
                  <span className="material-symbols-outlined text-[17px]">lock</span>
                  <span className="font-label-md text-xs font-medium">Sanctuary Passcode: <strong>7777</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.removeItem('ok_sanctuary_pin_unlocked');
                    } catch {
                      // Ignore
                    }
                    window.location.reload();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-container text-primary font-label-md text-[11px] uppercase tracking-wider border border-outline-variant/30 flex items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                  <span>Lock Now</span>
                </button>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant/80 italic">
                Google login is optional. As the only two users, your journal saves locally and syncs to your shared Firestore vault using passcode 7777.
              </p>
            </div>
          </div>

          {/* Interactive Firebase Project Credentials Drawer */}
          {showFbConfigDrawer && (
            <form
              onSubmit={handleSaveFirebaseConfig}
              className="bg-surface-container-low/75 rounded-xl p-4 border border-outline-variant/40 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-primary">
                  Firebase Project Configuration (Firestore + Auth)
                </span>
                <span className="font-label-md text-[10px] text-secondary">
                  Saves to Browser &amp; Connects Instantly
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-label-md text-[10px] uppercase text-outline block mb-1">
                    Firebase API Key
                  </label>
                  <input
                    type="text"
                    value={fbConfig.apiKey}
                    onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                </div>
                <div>
                  <label className="font-label-md text-[10px] uppercase text-outline block mb-1">
                    Firebase Project ID
                  </label>
                  <input
                    type="text"
                    value={fbConfig.projectId}
                    onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                    placeholder="our-keepsake-zea"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                </div>
                <div>
                  <label className="font-label-md text-[10px] uppercase text-outline block mb-1">
                    Auth Domain (Optional)
                  </label>
                  <input
                    type="text"
                    value={fbConfig.authDomain || ''}
                    onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                    placeholder="our-keepsake-zea.firebaseapp.com"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                </div>
                <div>
                  <label className="font-label-md text-[10px] uppercase text-outline block mb-1">
                    App ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={fbConfig.appId || ''}
                    onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                    placeholder="1:123456789:web:abcdef"
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider"
              >
                Save &amp; Connect Firebase Firestore
              </button>
            </form>
          )}

          {/* Sanctuary Settings Form (Exact match to Couple Settings fields) */}
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={form.partner1Name}
                  onChange={(e) => setForm({ ...form, partner1Name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                  Her Name
                </label>
                <input
                  type="text"
                  value={form.partner2Name}
                  onChange={(e) => setForm({ ...form, partner2Name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
                />
              </div>
            </div>

            {/* (2026-07-13) Separate meeting, courting, & anniversary; was single start date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                  Meeting Date
                </label>
                <input
                  type="date"
                  value={form.meetingDateISO || '2025-09-14'}
                  onChange={(e) =>
                    setForm({ ...form, meetingDateISO: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-primary calendar-num-font text-body-sm border border-outline-variant/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                  Courting Date
                </label>
                <input
                  type="date"
                  value={form.courtingDateISO || '2025-11-07'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      courtingDateISO: e.target.value,
                      relationshipStartDateISO: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-primary calendar-num-font text-body-sm border border-outline-variant/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-label-md text-label-md uppercase tracking-wider text-outline flex items-center justify-between mb-1">
                  <span>Anniversary Date</span>
                  <span className="text-[10px] text-secondary font-normal lowercase">optional (courting)</span>
                </label>
                <input
                  type="date"
                  value={form.anniversaryDateISO || ''}
                  onChange={(e) =>
                    setForm({ ...form, anniversaryDateISO: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-primary calendar-num-font text-body-sm border border-outline-variant/40 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                Stationery Theme
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, theme: form.theme === 'dark' ? 'light' : 'dark' })
                }
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 flex items-center justify-between"
              >
                <span>
                  {form.theme === 'dark' ? 'Midnight Espresso' : 'Warm Linen Paper'}
                </span>
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  {form.theme === 'dark' ? 'dark_mode' : 'light_mode'}
                </span>
              </button>
            </div>

            <div>
              <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                Romantic Banner Quote
              </label>
              <input
                type="text"
                value={form.heroQuote}
                onChange={(e) => setForm({ ...form, heroQuote: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
              />
            </div>

            {/* (2026-07-13) Showcase banner toggle & milestone inputs; was rendezvous only */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-surface-container-low/60 p-3.5 rounded-xl border border-outline-variant/30">
              <div className="sm:col-span-3 flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                  Top Showcase Banner
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, showNextRendezvous: !form.showNextRendezvous })}
                  className="px-2.5 py-1 rounded-lg text-xs font-label-md uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-outline-variant/40 bg-surface-container-lowest text-primary shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px] text-secondary">
                    {form.showNextRendezvous ? 'wb_twilight' : 'celebration'}
                  </span>
                  <span>{form.showNextRendezvous ? 'Next Rendezvous (On)' : 'Past Milestone (On)'}</span>
                </button>
              </div>
              {form.showNextRendezvous ? (
                <>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={form.nextRendezvousTitle}
                      onChange={(e) => setForm({ ...form, nextRendezvousTitle: e.target.value })}
                      placeholder="Sunset Picnic at Presidio"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={form.nextRendezvousDayLabel}
                      onChange={(e) => setForm({ ...form, nextRendezvousDayLabel: e.target.value })}
                      placeholder="This Sat"
                      className="w-full px-2.5 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                    />
                    <input
                      type="text"
                      value={form.nextRendezvousTimeLabel}
                      onChange={(e) =>
                        setForm({ ...form, nextRendezvousTimeLabel: e.target.value })
                      }
                      placeholder="5:30 PM"
                      className="w-full px-2.5 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={form.milestoneTitle || ''}
                      onChange={(e) => setForm({ ...form, milestoneTitle: e.target.value })}
                      placeholder="The Day I Courted Her"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={form.milestoneDateLabel || ''}
                      onChange={(e) => setForm({ ...form, milestoneDateLabel: e.target.value })}
                      placeholder="Nov 7, 2025"
                      className="w-full px-2.5 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                    />
                    <input
                      type="text"
                      value={form.milestoneTag || ''}
                      onChange={(e) => setForm({ ...form, milestoneTag: e.target.value })}
                      placeholder="Anniversary"
                      className="w-full px-2.5 py-2 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg uppercase tracking-wider shadow-md hover:bg-primary-container transition-colors"
            >
              Save Sanctuary Settings
            </button>
          </form>
        </section>

        {/* SECTION 2: DAILY BACKUPS SAVED ON FIRESTORE & LOCAL VAULT */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-md border border-outline-variant/35 flex flex-col gap-4">
          {/* (2026-07-13) Fix responsive backup toolbar wrap; was overflow on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/25 pb-3">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5 sm:mt-0">
                backup
              </span>
              <div className="min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-primary font-serif leading-tight">
                  Daily Backups Saved on Firestore &amp; Vault ({dailyBackups.length})
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant break-words">
                  Automated daily snapshots and manual checkpoints synced with{' '}
                  <span className="font-medium text-primary break-all">
                    couples/jp_zea_vault/daily_backups
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleCreateManualDailyBackup}
              className="self-start sm:self-auto shrink-0 px-3.5 sm:px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs sm:text-label-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
              <span>Create Daily Backup Now</span>
            </button>
          </div>

          {/* Export / Import / Clean Slate Toolbar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                exportJSONSnapshot(DB.createSnapshot());
                onToast('Exported JSON Keepsake Backup.', 'success');
              }}
              className="py-2.5 px-3 rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">
                download
              </span>
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportCSVSnapshot(DB.createSnapshot());
                onToast('Exported CSV Spreadsheet Backup.', 'success');
              }}
              className="py-2.5 px-3 rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">
                table_view
              </span>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await exportBothJSONandCSV(DB.createSnapshot());
                onToast('Full Backup All (JSON + CSV) saved!', 'success');
              }}
              className="py-2.5 px-3 rounded-xl bg-secondary-container text-on-secondary-container font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_download</span>
              <span>Backup All (JSON+CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-surface-container-high text-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </div>

          {/* Clean Slate vs Restore Original Showcase Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-surface-container-low/65 p-3.5 rounded-xl border border-outline-variant/30">
            <div className="flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase tracking-wider text-primary">
                  Main App Workspace State
                </span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-secondary calendar-num-font text-[10px] font-semibold uppercase">
                  {isCurrentlyBlankSlate
                    ? 'Clean Slate (0 Items)'
                    : `${memories.length} Memories • ${digitalLoveLetters.length} Letters • ${secretNotes.length} Notes`}
                </span>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setIsBusy(true);
                  await onResetToCleanSlate();
                  setIsBusy(false);
                  onToast('Main journal reset to a fresh Clean Slate!', 'info');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-surface-container-lowest text-primary font-label-md text-label-md uppercase tracking-wider border border-outline-variant/40 hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  cleaning_services
                </span>
                <span>Reset Main App to Clean Slate</span>
              </button>
            </div>

            <div className="flex flex-col justify-between gap-2">
              <span className="font-label-md text-label-md uppercase tracking-wider text-secondary">
                Showcase Template Data
              </span>
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setIsBusy(true);
                  await onRestoreShowcaseArchive();
                  setIsBusy(false);
                  onToast('Backed-up showcase memories, letters & notes restored!', 'success');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">
                  settings_backup_restore
                </span>
                <span>Restore Showcase Archive to App</span>
              </button>
            </div>
          </div>

          {/* Segmented Inspector Tabs: Daily Backups List vs Backed-Up Items */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {/* (2026-07-13) Display live counts for memories/notes vs sample data */}
            {[
              {
                id: 'DAILY_BACKUPS',
                label: `Daily Firestore Backups (${dailyBackups.length})`,
              },
              { id: 'MEMORIES', label: `Keepsake Memories (${memories.length})` },
              {
                id: 'LETTERS',
                label: `Love Letters (${digitalLoveLetters.length})`,
              },
              {
                id: 'SECRET_NOTES',
                label: `Secret Notes (${secretNotes.length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setPreviewSection(
                    tab.id as 'DAILY_BACKUPS' | 'MEMORIES' | 'LETTERS' | 'SECRET_NOTES'
                  )
                }
                className={`px-3.5 py-1.5 rounded-full font-label-md text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors ${
                  previewSection === tab.id
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-low text-secondary hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: DAILY BACKUPS SAVED ON FIRESTORE & LOCAL VAULT */}
          {previewSection === 'DAILY_BACKUPS' && (
            <div className="flex flex-col gap-3">
              {dailyBackups.map((record) => (
                <div
                  key={record.id}
                  className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="calendar-num-font text-[12px] font-bold text-primary">
                        {formatStandardDate(record.dateISO)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-label-md text-[9px] uppercase tracking-wider flex items-center gap-1 ${
                          record.syncedToFirestore
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-surface-container-high text-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          {record.syncedToFirestore ? 'cloud_done' : 'storage'}
                        </span>
                        <span>
                          {record.syncedToFirestore
                            ? 'Saved on Firestore'
                            : 'Local IndexedDB Vault'}
                        </span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-outline font-label-md text-[9px] uppercase">
                        {record.trigger}
                      </span>
                    </div>

                    <p className="font-headline-sm text-body-md text-primary font-serif truncate-single">
                      {record.label}
                    </p>

                    <p className="calendar-num-font text-[11px] text-secondary">
                      {record.memoriesCount} Date Memories • {record.lettersCount} Digital Love
                      Letters • {record.notesCount} Secret Year Notes
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* (2026-07-13) Add JSON+CSV download and snapshot fallback safeguard */}
                    <button
                      type="button"
                      onClick={async () => {
                        const targetSnapshot = record.snapshot || DB.createSnapshot();
                        await DB.restoreSnapshot(targetSnapshot);
                        syncManager.schedulePush();
                        onToast(`Restored snapshot "${record.label}" to live app!`, 'success');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-[10px] uppercase tracking-wider active:scale-95 transition-transform"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportJSONSnapshot(record.snapshot || DB.createSnapshot());
                        onToast('Downloaded daily backup JSON.', 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-label-md text-[10px] uppercase border border-outline-variant/40"
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportCSVSnapshot(record.snapshot || DB.createSnapshot());
                        onToast('Downloaded daily backup CSV.', 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-label-md text-[10px] uppercase border border-outline-variant/40"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await exportBothJSONandCSV(record.snapshot || DB.createSnapshot());
                        onToast('Downloaded backup snapshot (JSON + CSV)!', 'success');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-secondary-container/80 text-on-secondary-container font-label-md text-[10px] uppercase border border-outline-variant/40"
                    >
                      JSON+CSV
                    </button>
                    {!record.syncedToFirestore && (
                      <button
                        type="button"
                        onClick={async () => {
                          await syncManager.pushDailyBackupToFirestore(record);
                          onToast('Snapshot synced to Firestore daily_backups!', 'success');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-[10px] uppercase"
                      >
                        Push Cloud
                      </button>
                    )}
                    {record.trigger !== 'SHOWCASE_ARCHIVE' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await syncManager.deleteDailyBackupFromFirestore(record.id);
                          onToast('Daily backup snapshot deleted.', 'info');
                        }}
                        className="p-1.5 rounded-lg text-error hover:bg-error-container/40"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: LIVE KEEPSAKE MEMORIES */}
          {previewSection === 'MEMORIES' && (
            <div className="flex flex-col gap-3">
              {memories.length === 0 ? (
                <p className="text-center py-6 text-on-surface-variant font-body-sm text-body-sm">
                  No keepsake memories added yet. A clean canvas is ready for your uploads.
                </p>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/25 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-secondary font-label-md text-[10px] uppercase tracking-wider">
                      <span>
                        Keepsake #{mem.keepsakeNumber} • {mem.location}
                      </span>
                      <span>{formatStandardDate(mem.dateISO)}</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                      {mem.title}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                      “{mem.quoteHighlight}”
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-line">
                      {mem.storyBody}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: LIVE DIGITAL LOVE LETTERS */}
          {previewSection === 'LETTERS' && (
            <div className="flex flex-col gap-3">
              {digitalLoveLetters.length === 0 ? (
                <p className="text-center py-6 text-on-surface-variant font-body-sm text-body-sm">
                  No love letters recorded yet.
                </p>
              ) : (
                digitalLoveLetters.map((letter) => (
                  <div
                    key={letter.id}
                    className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/25 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-secondary font-label-md text-[10px] uppercase tracking-wider">
                      {/* (2026-07-13) Omit letter number prefix; was Letter # */}
                      <span>
                        Love Letter • {letter.occasion}
                      </span>
                      <span>{formatStandardDate(letter.dateISO)}</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                      {letter.title}
                    </h3>
                    <p className="font-body-sm text-body-sm text-primary italic font-serif">
                      {letter.salutation}
                    </p>
                    {/* (2026-07-13) Clamp backup preview body; was unclamped full text */}
                    <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-line font-serif line-clamp-3">
                      {letter.body}
                    </p>
                    <p className="font-body-sm text-body-sm text-secondary italic text-right font-serif">
                      {letter.signOff}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: LIVE SECRET YEAR NOTES */}
          {previewSection === 'SECRET_NOTES' && (
            <div className="flex flex-col gap-3">
              {secretNotes.length === 0 ? (
                <p className="text-center py-6 text-on-surface-variant font-body-sm text-body-sm">
                  No secret notes recorded yet.
                </p>
              ) : (
                secretNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/25 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-secondary font-label-md text-[10px] uppercase tracking-wider">
                      <span>{note.monthLabel}</span>
                      <span>{formatStandardDate(note.dateISO)}</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                      {note.title}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface">
                      {note.littleThingsNoted}
                    </p>
                    <p className="font-body-sm text-body-sm text-secondary italic font-serif">
                      {note.whatSheSaid}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
