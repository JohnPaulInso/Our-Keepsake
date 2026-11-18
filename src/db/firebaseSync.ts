// (2026-07-13) Connect Our Keepsake Firebase config & Analytics vs unconfigured
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  enableIndexedDbPersistence,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
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

      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);
      // (2026-07-13) Silently sign in anonymously if available; was uncalled
      if (this.auth && !this.auth.currentUser) {
        signInAnonymously(this.auth).catch(() => {});
      }

      enableIndexedDbPersistence(this.db).catch(() => {
        // Multi-tab or unsupported browser fallback
      });

      await DB.ready;
      await this.pullSnapshot();
      // (2026-07-13) Auto-push local unpushed memories online on startup; was idle
      if (this.db && this.status !== 'permission-denied' && this.status !== 'quota') {
        this.schedulePush();
      }
      // Sync local daily backups (including showcase archive) to Firestore daily_backups
      const localBackups = DB.getDailyBackups();
      for (const b of localBackups) {
        this.pushDailyBackupToFirestore(b).catch(() => {});
      }
      // (2026-07-13) Auto-sync local DB mutations to Firestore vs manual push only
      DB.subscribe(() => {
        if (!this.isApplyingRemoteSnapshot && this.db && this.status !== 'quota') {
          this.schedulePush();
        }
      });
      this.startRealtimeListener();
      this.startDailyBackupsListener();
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

  async pullSnapshot(): Promise<void> {
    if (!this.db || this.status === 'quota') return;
    try {
      this.status = 'syncing';
      this.notify();
      const docRef = doc(this.db, 'couples', 'jp_zea_vault');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remote = snap.data() as BackupSnapshot & { updatedAt?: number };
        // (2026-07-13) Support updatedAt fallback for Firestore pull vs exportedAt only
        const remoteTime = remote.exportedAt || remote.updatedAt || 0;
        const localBaseline = Number(localStorage.getItem('ok_sync_baseline') || 0);
        if (remoteTime > localBaseline) {
          this.isApplyingRemoteSnapshot = true;
          await DB.restoreSnapshot(remote);
          this.isApplyingRemoteSnapshot = false;
        }
      } else {
        // (2026-07-13) Seed empty remote Firestore with local data; was no-op
        await this.pushSnapshot();
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

  // (2026-07-13) Sanitize snapshots and split large media for Firestore limits
  private async sanitizeSnapshotForFirestore(snapshot: BackupSnapshot): Promise<BackupSnapshot> {
    const cloned: BackupSnapshot = JSON.parse(JSON.stringify(snapshot));
    if (Array.isArray(cloned.memories)) {
      for (const mem of cloned.memories) {
        if (Array.isArray(mem.photos)) {
          for (const photo of mem.photos) {
            if (photo.url && photo.url.length > 150000) {
              const mediaDocId = `${mem.id}_${photo.id}`;
              await idbSet(mediaDocId, photo.url, 'post_media');
              if (this.db) {
                const mediaRef = doc(this.db, 'post_media', mediaDocId);
                await setDoc(mediaRef, { id: mediaDocId, dataUrl: photo.url, updatedAt: Date.now() });
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
        if (!snap.exists() || this.isSyncing) return;
        const data = snap.data() as BackupSnapshot;
        // (2026-07-13) Check remote exportedAt/updatedAt vs local baseline comparison
        const remoteTime = data.exportedAt || (data as { updatedAt?: number }).updatedAt || 0;
        const localBaseline = Number(localStorage.getItem('ok_sync_baseline') || 0);
        if (remoteTime <= localBaseline) return;

        this.isApplyingRemoteSnapshot = true;
        if (Array.isArray(data.memories)) {
          for (const mem of data.memories) {
            for (const photo of mem.photos) {
              if (photo.url?.startsWith('split_media://')) {
                const mediaId = photo.url.replace('split_media://', '');
                const cached = await idbGet<string>(mediaId, 'post_media');
                if (cached) {
                  photo.url = cached;
                }
              }
            }
          }
        }
        await DB.restoreSnapshot(data);
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
