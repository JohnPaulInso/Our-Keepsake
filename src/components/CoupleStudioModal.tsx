// (2026-07-13) Add Couple Profile, Auth & Backup/Restore Modal per SKILL.md
import React, { useState, useEffect, useRef } from 'react';
import { BackupSnapshot, CoupleProfile } from '../types';
import {
  DB,
  exportBothJSONandCSV,
  exportCSVSnapshot,
  exportJSONSnapshot,
} from '../db/localDb';
import { syncManager } from '../db/firebaseSync';
import { formatStandardDate } from '../utils/dateFormat';

interface CoupleStudioModalProps {
  profile: CoupleProfile;
  onClose: () => void;
  onUpdateProfile: (next: CoupleProfile) => void;
  onTriggerSkeletonReload: () => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
}

export const CoupleStudioModal: React.FC<CoupleStudioModalProps> = ({
  profile,
  onClose,
  onUpdateProfile,
  onTriggerSkeletonReload,
  onToast,
}) => {
  const [form, setForm] = useState<CoupleProfile>(profile);
  const [syncInfo, setSyncInfo] = useState(syncManager.getStatus());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    const unsub = syncManager.subscribe(() => {
      setSyncInfo(syncManager.getStatus());
    });
    return () => {
      document.body.classList.remove('overflow-hidden');
      unsub();
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CoupleProfile = {
      ...form,
      partner1Name: form.partner1Name.trim() || 'JP',
      partner2Name: form.partner2Name.trim() || 'Zea',
      updatedAt: Date.now(),
    };
    onUpdateProfile(updated);
    onToast('Couple Keepsake settings saved.', 'success');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    const res = await syncManager.signInWithGoogle();
    setIsSigningIn(false);
    if (res.ok) {
      onToast(`Signed in as ${res.email || 'jp.and.zea@keepsake.love'}`, 'success');
      onClose();
      onTriggerSkeletonReload();
    } else if (res.cancelled) {
      onToast('Sign-in popup closed. You can retry anytime.', 'info');
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await new Promise((r) => setTimeout(r, 650));
    await syncManager.signOut();
    setIsLoggingOut(false);
    onToast('Signed out cleanly. Local keepsake vault remains safe.', 'info');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input immediately so re-selecting the same file always fires onChange per SKILL.md Part 6 Rule 7
    e.target.value = '';
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupSnapshot;
      if (!parsed || (!Array.isArray(parsed.memories) && !parsed.coupleProfile)) {
        throw new Error('Invalid backup structure');
      }
      await new Promise((r) => setTimeout(r, 500));
      await DB.restoreSnapshot(parsed);
      syncManager.schedulePush();
      onToast('Full Keepsake Archive restored from backup!', 'success');
      onClose();
    } catch {
      onToast('Could not parse backup file. Please select a valid JSON backup.', 'danger');
    } finally {
      setIsRestoring(false);
    }
  };

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 max-w-xs w-full text-center modal-animate-in">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <h4 className="font-headline-sm text-headline-sm text-primary">
            Sealing Vault &amp; Logging Out...
          </h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Preserving offline IndexedDB snapshots safely.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="couple-studio-modal-backdrop" // Couple studio settings & backup modal
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-xs">
              <span
                className="material-symbols-outlined text-[19px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-primary">
                {form.partner1Name} &amp; {form.partner2Name} • Keepsake Sanctuary
              </h3>
              {/* (2026-07-13) Show courting stage vs premature anniversary in modal */}
              <p className="font-label-md text-label-md text-secondary uppercase tracking-wider">
                {form.anniversaryDateISO
                  ? `Since ${formatStandardDate(form.anniversaryDateISO)}`
                  : `Courting Since Nov 7, 2025`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Cloud Sync & Google Sign-In Section */}
        <div className="bg-surface-container-low rounded-xl p-3.5 border border-outline-variant/30 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">cloud_sync</span>
              <span className="font-label-lg text-label-lg text-primary">
                Local-First &amp; Cloud Sync
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/70 text-on-secondary-container font-label-md text-[10px] uppercase tracking-wider">
              {syncInfo.status === 'quota'
                ? 'Quota Reached (Local)'
                : syncInfo.status === 'cloud-live'
                  ? 'Cloud Live'
                  : 'IndexedDB Ready'}
            </span>
          </div>
          {syncInfo.userEmail ? (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate-single">
                Connected: <strong className="text-primary">{syncInfo.userEmail}</strong>
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high text-primary font-label-md text-label-md uppercase tracking-wider shrink-0"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isSigningIn}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">account_circle</span>
              <span>{isSigningIn ? 'Connecting Google Account...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>

        {/* Couple Profile & Rendezvous Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={form.partner1Name}
                onChange={(e) => setForm({ ...form, partner1Name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
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
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
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
                onChange={(e) => setForm({ ...form, meetingDateISO: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
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
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-label-md text-label-md uppercase tracking-wider text-outline flex items-center justify-between mb-1">
                <span>Official Anniversary</span>
                <span className="text-[9px] text-secondary lowercase">courting</span>
              </label>
              <input
                type="date"
                value={form.anniversaryDateISO || ''}
                onChange={(e) => setForm({ ...form, anniversaryDateISO: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
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
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 flex items-center justify-between"
            >
              <span>{form.theme === 'dark' ? 'Midnight Espresso' : 'Warm Linen Paper'}</span>
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
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
            />
          </div>

          {/* (2026-07-13) Showcase banner toggle & milestone inputs; was rendezvous only */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-surface-container-low/60 p-3 rounded-xl border border-outline-variant/30">
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
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={form.nextRendezvousDayLabel}
                    onChange={(e) => setForm({ ...form, nextRendezvousDayLabel: e.target.value })}
                    placeholder="This Sat"
                    className="w-full px-2 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                  <input
                    type="text"
                    value={form.nextRendezvousTimeLabel}
                    onChange={(e) => setForm({ ...form, nextRendezvousTimeLabel: e.target.value })}
                    placeholder="5:30 PM"
                    className="w-full px-2 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
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
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={form.milestoneDateLabel || ''}
                    onChange={(e) => setForm({ ...form, milestoneDateLabel: e.target.value })}
                    placeholder="Nov 7, 2025"
                    className="w-full px-2 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                  <input
                    type="text"
                    value={form.milestoneTag || ''}
                    onChange={(e) => setForm({ ...form, milestoneTag: e.target.value })}
                    placeholder="Anniversary"
                    className="w-full px-2 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-body-sm text-body-sm border border-outline-variant/40"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg uppercase tracking-wider shadow-md"
          >
            Save Sanctuary Settings
          </button>
        </form>

        {/* Data Portability: Backup & Restore (JSON + CSV) per SKILL.md */}
        <div className="border-t border-outline-variant/30 pt-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-label-lg text-label-lg text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                folder_zip
              </span>
              Backup &amp; Restore Vault
            </span>
            <span className="font-label-md text-label-md text-outline">JSON + CSV</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                exportJSONSnapshot(DB.createSnapshot());
                onToast('Exported JSON Keepsake Backup.', 'success');
              }}
              className="py-2 px-3 rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">download</span>
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportCSVSnapshot(DB.createSnapshot());
                onToast('Exported CSV Spreadsheet Backup.', 'success');
              }}
              className="py-2 px-3 rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">
                table_view
              </span>
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                await exportBothJSONandCSV(DB.createSnapshot());
                onToast('Full Backup All (JSON + CSV) saved!', 'success');
              }}
              className="py-2.5 px-3 rounded-xl bg-secondary-container text-on-secondary-container font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_download</span>
              <span>Backup All (JSON + CSV)</span>
            </button>
            <button
              type="button"
              disabled={isRestoring}
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-surface-container-high text-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>{isRestoring ? 'Restoring Vault...' : 'Import Backup JSON'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
