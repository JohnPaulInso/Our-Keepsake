// (2026-07-13) Connect Our Keepsake Firebase config & Analytics vs unconfigured
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
// (2026-07-13) Add onAuthStateChanged for live auth sync; was static user
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
  Auth,
} from 'firebase/auth';
import { DB, idbGet, idbSet } from './localDb';
import { BackupSnapshot, DailyBackupRecord, FirebaseRuntimeConfig } from '../types';

// (2026-07-13) Add permission-denied status and sync google-services apiKey
export type SyncStatus = 'local-ready' | 'syncing' | 'cloud-live' | 'quota' | 'offline' | 'permission-denied';

const RUNTIME_CONFIG_KEY = 'ok_firebase_runtime_config';

export const DEFAULT_FIREBASE_CONFIG: FirebaseRuntimeConfig = {
  apiKey: 'AIzaSyCPDlWQlj9awT7JpEOBTvhemNErs3ubLJU',
  authDomain: 'our-keepsake.firebaseapp.com',
  projectId: 'our-keepsake',
  storageBucket: 'our-keepsake.firebasestorage.app',
  messagingSenderId: '545529586713',
  appId: '1:545529586713:web:793e7dcfe7bb07150bb688',
  measurementId: 'G-8V1R6HC52K',
};

class FirebaseSyncManager {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;
  private unsubscribeSnapshot: Unsubscribe | null = null;
  private unsubscribeDailyBackups: Unsubscribe | null = null;
  private isSyncing = false;
  private isApplyingRemoteSnapshot = false;
  private debounceTimer: number | null = null;
  private status: SyncStatus = 'local-ready';
  private userEmail: string | null = null;
  private activeProjectId: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initFirebaseIfConfigured();
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  getStatus() {
    return {
      status: this.status,
      userEmail: this.userEmail,
      isCloudConfigured: Boolean(this.db),
      projectId: this.activeProjectId,
    };
  }

  // (2026-07-13) Use Our Keepsake Firebase config by default vs empty fallback
  getRuntimeConfig(): FirebaseRuntimeConfig {
    try {
      const raw = localStorage.getItem(RUNTIME_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FirebaseRuntimeConfig;
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId:
        import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
        DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
      measurementId:
        import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
    };
  }

  async saveRuntimeConfig(config: FirebaseRuntimeConfig): Promise<boolean> {
    try {
      localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(config));
      this.stopRealtimeListener();
      await this.initFirebaseIfConfigured();
      return Boolean(this.db);
    } catch {
      return false;
    }
  }

  private async initFirebaseIfConfigured() {
    try {
      const savedUser = localStorage.getItem('ok_auth_user_email');
      if (savedUser) {
        this.userEmail = savedUser;
      }

      const cfg = this.getRuntimeConfig();
      const apiKey = cfg.apiKey?.trim();
      const projectId = cfg.projectId?.trim();
      if (!apiKey || !projectId) {
        this.status = 'local-ready';
        this.activeProjectId = null;
        this.notify();
        return;
      }

      this.activeProjectId = projectId;
      const existingApps = getApps();
      this.app =
        existingApps.length > 0
          ? existingApps[0]
          : initializeApp({
              apiKey,
              authDomain: cfg.authDomain || `${projectId}.firebaseapp.com`,
              projectId,
              storageBucket: cfg.storageBucket || `${projectId}.firebasestorage.app`,
              messagingSenderId: cfg.messagingSenderId,
              appId: cfg.appId,
              measurementId: cfg.measurementId,
            });

      // Initialize Firebase Analytics safely in browser
      isAnalyticsSupported()
        .then((yes) => {
          if (yes && this.app) {
            getAnalytics(this.app);
          }
        })
        .catch(() => {});

      // (2026-07-13) Use persistentLocalCache; was enableIndexedDbPersistence
      try {
        this.db = initializeFirestore(this.app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        this.db = getFirestore(this.app);
      }
      this.auth = getAuth(this.app);
      // (2026-07-13) Fix APK initial sync & auth state; was unawaited anon login
      if (this.auth && !this.auth.currentUser) {
        try {
          await signInAnonymously(this.auth);
        } catch {
          // Continue if offline or anonymous auth not enabled
        }
      }

      await DB.ready;
      await this.pullSnapshot();
      // Only push on startup if local memories exist (> 4) and remote was clean
      const initialLocal = DB.getMemories();
      if (this.db && this.status !== 'permission-denied' && this.status !== 'quota' && initialLocal.length > 4) {
        this.schedulePush();
      }
      // Sync local daily backups (including showcase archive) to Firestore daily_backups
      const localBackups = DB.getDailyBackups();
      for (const b of localBackups) {
        this.pushDailyBackupToFirestore(b).catch(() => {});
      }
      // Auto-sync local DB mutations to Firestore
      DB.subscribe(() => {
        if (!this.isApplyingRemoteSnapshot && this.db && this.status !== 'quota') {
          this.schedulePush();
        }
      });
      this.startRealtimeListener();
      this.startDailyBackupsListener();

      if (this.auth) {
        onAuthStateChanged(this.auth, (user) => {
          if (user) {
            this.userEmail = user.email || (user.isAnonymous ? 'anonymous' : null);
            this.pullSnapshot(true);
          }
        });
      }
    } catch {
      this.status = 'local-ready';
      this.notify();
    }
  }

  async signInWithGoogle(): Promise<{ ok: boolean; email?: string; cancelled?: boolean }> {
    if (!this.auth) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.userEmail = 'jp.and.zea@keepsake.love';
          try {
            localStorage.setItem('ok_auth_user_email', this.userEmail);
            localStorage.setItem('ok_onboarded', 'true');
          } catch {
            // Ignore
          }
          this.notify();
          resolve({ ok: true, email: this.userEmail });
        }, 450);
      });
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const email = result.user?.email || 'jp.and.zea@keepsake.love';
      this.userEmail = email;
      try {
        localStorage.setItem('ok_auth_user_email', email);
        localStorage.setItem('ok_onboarded', 'true');
      } catch {
        // Ignore
      }
      this.notify();
      await this.pullSnapshot();
      return { ok: true, email };
    } catch {
      this.notify();
      return { ok: false, cancelled: true };
    }
  }

  async signOut(): Promise<void> {
    if (this.auth) {
      try {
        await fbSignOut(this.auth);
      } catch {
        // Ignore
      }
    }
    this.userEmail = null;
    try {
      localStorage.removeItem('ok_auth_user_email');
    } catch {
      // Ignore
    }
    this.notify();
  }

  // (2026-07-13) Pull and restore live cloud memories on launch; was strict baseline
  // (2026-07-13) Bind pullSnapshot as arrow method; was unbound class method
  pullSnapshot = async (force = false): Promise<void> => {
    if (!this.db || this.status === 'quota') return;
    try {
      this.status = 'syncing';
      this.notify();
      const docRef = doc(this.db, 'couples', 'jp_zea_vault');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remote = snap.data() as BackupSnapshot & { updatedAt?: number };
        const remoteTime = remote.exportedAt || remote.updatedAt || 0;
        const localBaseline = Number(localStorage.getItem('ok_sync_baseline') || 0);
        const localMemories = DB.getMemories();
        const remoteCount = Array.isArray(remote.memories) ? remote.memories.length : 0;

        const shouldRestore =
          force ||
          remoteTime > localBaseline ||
          (remoteCount > 0 && localMemories.length <= 4) ||
          remoteCount > localMemories.length;

        if (shouldRestore) {
          this.isApplyingRemoteSnapshot = true;
          // (2026-07-13) Resolve split media URLs before restoring snapshot; was raw
          await this.resolveMediaUrls(remote);
          await DB.restoreSnapshot(remote);
          this.isApplyingRemoteSnapshot = false;
          if (remoteTime > 0) {
            localStorage.setItem('ok_sync_baseline', String(remoteTime));
          }
        }
      } else {
        const localMemories = DB.getMemories();
        if (localMemories.length > 4) {
          await this.pushSnapshot();
        }
      }
      this.status = 'cloud-live';
      this.notify();
    } catch (err: unknown) {
      // (2026-07-13) Surface permission-denied for Firestore rules; was silent local fallback
      const msg = String((err as { code?: string })?.code || err);
      console.error('[FirebaseSync] pullSnapshot error:', err);
      if (msg.includes('resource-exhausted') || msg.includes('quota')) {
        this.status = 'quota';
      } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
        this.status = 'permission-denied';
      } else {
        this.status = 'local-ready';
      }
      this.notify();
    }
  }

  schedulePush(): void {
    if (this.isApplyingRemoteSnapshot || this.status === 'quota') return;
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.pushSnapshot();
    }, 900);
  }

  // (2026-07-13) Bind resolveMediaUrls as arrow method; was unbound class method
  resolveMediaUrls = async (data: BackupSnapshot): Promise<void> => {
    if (!Array.isArray(data.memories)) return;
    for (const mem of data.memories) {
      if (!Array.isArray(mem.photos)) continue;
      for (const photo of mem.photos) {
        if (photo.url?.startsWith('split_media://')) {
          const mediaId = photo.url.replace('split_media://', '');
          let resolved = await idbGet<string>(mediaId, 'post_media');
          if (!resolved && this.db) {
            try {
              const photoSnap = await getDoc(doc(this.db, 'couples', 'jp_zea_vault', 'photos', mediaId));
              if (photoSnap.exists()) {
                resolved = photoSnap.data()?.dataUrl;
                if (resolved) {
                  await idbSet(mediaId, resolved, 'post_media');
                }
              }
            } catch {
              // Ignore
            }
          }
          if (!resolved) {
            const existingMem = DB.getMemories().find((m) => m.id === mem.id);
            const matchedPhoto = existingMem?.photos?.find((p) => p.id === photo.id);
            if (matchedPhoto?.url && !matchedPhoto.url.startsWith('split_media://')) {
              resolved = matchedPhoto.url;
            }
          }
          if (resolved) {
            photo.url = resolved;
          }
        }
      }
    }
  }

  // (2026-07-13) Split photos > 80KB into subcollection; was root post_media >150k
  private async sanitizeSnapshotForFirestore(snapshot: BackupSnapshot): Promise<BackupSnapshot> {
    const cloned: BackupSnapshot = JSON.parse(JSON.stringify(snapshot));
    if (Array.isArray(cloned.memories)) {
      for (const mem of cloned.memories) {
        if (Array.isArray(mem.photos)) {
          for (const photo of mem.photos) {
            if (photo.url && photo.url.length > 80000) {
              const mediaDocId = `${mem.id}_${photo.id}`;
              await idbSet(mediaDocId, photo.url, 'post_media');
              if (this.db) {
                try {
                  const mediaRef = doc(this.db, 'couples', 'jp_zea_vault', 'photos', mediaDocId);
                  await setDoc(mediaRef, { id: mediaDocId, dataUrl: photo.url, updatedAt: Date.now() });
                } catch (e) {
                  console.warn('[FirebaseSync] Could not upload split photo:', e);
                }
              }
              photo.url = `split_media://${mediaDocId}`;
            }
          }
        }
      }
    }
    return cloned;
  }

  async pushSnapshot(): Promise<void> {
    if (!this.db || this.isSyncing || this.isApplyingRemoteSnapshot || this.status === 'quota') {
      return;
    }
    this.isSyncing = true;
    try {
      this.status = 'syncing';
      this.notify();
      const snapshot = DB.createSnapshot();
      const cloned = await this.sanitizeSnapshotForFirestore(snapshot);

      const docRef = doc(this.db, 'couples', 'jp_zea_vault');
      // (2026-07-13) Set updatedAt timestamp on Firestore vault push vs missing date
      await setDoc(docRef, { ...cloned, updatedAt: Date.now() }, { merge: true });

      // Also update today's automated daily backup in Firestore
      const todayISO = new Date().toISOString().slice(0, 10);
      const dailyId = `daily_auto_${todayISO}`;
      const dailyRecord: DailyBackupRecord = {
        id: dailyId,
        dateISO: todayISO,
        label: `Firestore Auto Daily Backup (${todayISO})`,
        createdAt: Date.now(),
        trigger: 'AUTO_DAILY',
        syncedToFirestore: true,
        memoriesCount: cloned.memories.length,
        lettersCount: cloned.digitalLoveLetters?.length || 0,
        notesCount: cloned.secretYearNotes.length,
        snapshot: cloned,
      };
      const dailyRef = doc(this.db, 'couples', 'jp_zea_vault', 'daily_backups', dailyId);
      await setDoc(dailyRef, dailyRecord, { merge: true });
      await DB.upsertDailyBackupRecord(dailyRecord);

      localStorage.setItem('ok_sync_baseline', String(snapshot.exportedAt));
      this.status = 'cloud-live';
    } catch (err: unknown) {
      // (2026-07-13) Surface permission-denied on push error; was silent fallback
      const msg = String((err as { code?: string })?.code || err);
      console.error('[FirebaseSync] pushSnapshot error:', err);
      if (msg.includes('resource-exhausted') || msg.includes('quota')) {
        this.status = 'quota';
      } else if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
        this.status = 'permission-denied';
      } else {
        this.status = 'local-ready';
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  async pushDailyBackupToFirestore(record: DailyBackupRecord): Promise<boolean> {
    const updated: DailyBackupRecord = {
      ...record,
      syncedToFirestore: true,
    };
    await DB.upsertDailyBackupRecord(updated);
    if (!this.db || this.status === 'quota') {
      return false;
    }
    try {
      // (2026-07-13) Sanitize daily backup snapshot before Firestore write vs raw
      const sanitizedSnapshot = await this.sanitizeSnapshotForFirestore(
        record.snapshot || DB.createSnapshot()
      );
      const cloudRecord: DailyBackupRecord = {
        ...updated,
        snapshot: sanitizedSnapshot,
      };
      const dailyRef = doc(this.db, 'couples', 'jp_zea_vault', 'daily_backups', record.id);
      await setDoc(dailyRef, cloudRecord, { merge: true });
      return true;
    } catch {
      return false;
    }
  }

  async deleteDailyBackupFromFirestore(id: string): Promise<void> {
    await DB.deleteDailyBackupRecord(id);
    if (!this.db || this.status === 'quota') return;
    try {
      const dailyRef = doc(this.db, 'couples', 'jp_zea_vault', 'daily_backups', id);
      await deleteDoc(dailyRef);
    } catch {
      // Ignore
    }
  }

  startDailyBackupsListener(): void {
    if (!this.db || this.status === 'quota') return;
    if (this.unsubscribeDailyBackups) {
      this.unsubscribeDailyBackups();
      this.unsubscribeDailyBackups = null;
    }
    const colRef = collection(this.db, 'couples', 'jp_zea_vault', 'daily_backups');
    this.unsubscribeDailyBackups = onSnapshot(
      colRef,
      async (querySnap) => {
        for (const docSnap of querySnap.docs) {
          const record = docSnap.data() as DailyBackupRecord;
          if (record && record.id && record.snapshot) {
            await DB.upsertDailyBackupRecord({ ...record, syncedToFirestore: true });
          }
        }
      },
      (err) => {
        if (String(err?.code || err).includes('resource-exhausted')) {
          this.status = 'quota';
          this.stopRealtimeListener();
          this.notify();
        }
      }
    );
  }

  startRealtimeListener(): void {
    if (!this.db || this.status === 'quota') return;
    this.stopRealtimeListener();
    const docRef = doc(this.db, 'couples', 'jp_zea_vault');
    this.unsubscribeSnapshot = onSnapshot(
      docRef,
      async (snap) => {
        // (2026-07-13) Ignore local echo writes in onSnapshot; was echoing write
        if (!snap.exists() || this.isSyncing || snap.metadata.hasPendingWrites) return;
        const data = snap.data() as BackupSnapshot & { updatedAt?: number };
        // (2026-07-13) Live sync remote memories to cache; was skip on baseline
        const remoteTime = data.exportedAt || data.updatedAt || 0;
        const localBaseline = Number(localStorage.getItem('ok_sync_baseline') || 0);
        const localMemories = DB.getMemories();
        const remoteCount = Array.isArray(data.memories) ? data.memories.length : 0;

        const shouldApply =
          remoteTime > localBaseline ||
          remoteCount > localMemories.length ||
          (remoteCount > 0 && localMemories.length <= 4);

        if (!shouldApply) return;

        this.isApplyingRemoteSnapshot = true;
        // (2026-07-13) Resolve media URLs from cache/subcollection; was loop
        await this.resolveMediaUrls(data);
        await DB.restoreSnapshot(data);
        if (remoteTime > 0) {
          localStorage.setItem('ok_sync_baseline', String(remoteTime));
        }
        this.isApplyingRemoteSnapshot = false;
      },
      (err) => {
        if (String(err?.code || err).includes('resource-exhausted')) {
          this.status = 'quota';
          this.stopRealtimeListener();
          this.notify();
        }
      }
    );
  }

  stopRealtimeListener(): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    if (this.unsubscribeDailyBackups) {
      this.unsubscribeDailyBackups();
      this.unsubscribeDailyBackups = null;
    }
  }
}

export const syncManager = new FirebaseSyncManager();
