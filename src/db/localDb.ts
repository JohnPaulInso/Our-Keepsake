// (2026-07-13) Implement IndexedDB + memCache + localStorage per SKILL.md
// (2026-07-13) Add digitalLoveLetters to IndexedDB cache vs missing store
import {
  ActiveTab,
  BackupSnapshot,
  CoupleProfile,
  DailyBackupRecord,
  DigitalLoveLetter,
  KeepsakeMemory,
  SecretYearNote,
  TimeCapsuleItem,
} from '../types';
import {
  COUPLE_AVATAR_URL,
  DEFAULT_COUPLE_PROFILE,
  INITIAL_DIGITAL_LOVE_LETTERS,
  INITIAL_MEMORIES,
  INITIAL_SECRET_YEAR_NOTES,
  INITIAL_TIME_CAPSULE,
} from '../data/seedMemories';

// (2026-07-13) Switch default store to clean slate & archive showcase to backup
const IDB_NAME = 'OurKeepsakeDB_v2_CleanSlate';
const IDB_VERSION = 1;
const STORE_KV = 'kv_store';
const STORE_MEDIA = 'post_media';
const STORE_BACKUPS = 'backups';

export const IDB_ONLY_KEYS = new Set([
  'memories',
  'secretYearNotes',
  'digitalLoveLetters',
  'timeCapsule',
  'coupleProfile',
]);

export const CLEAN_TIME_CAPSULE: TimeCapsuleItem = {
  ...INITIAL_TIME_CAPSULE,
  sealedLetters: [],
};

interface MemCacheShape {
  memories: KeepsakeMemory[];
  secretYearNotes: SecretYearNote[];
  digitalLoveLetters: DigitalLoveLetter[];
  coupleProfile: CoupleProfile;
  timeCapsule: TimeCapsuleItem;
  dailyBackups: DailyBackupRecord[];
}

const memCache: MemCacheShape = {
  memories: [],
  secretYearNotes: [],
  digitalLoveLetters: [],
  coupleProfile: DEFAULT_COUPLE_PROFILE,
  timeCapsule: CLEAN_TIME_CAPSULE,
  dailyBackups: [],
};

let dbInstance: IDBDatabase | null = null;

function openIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV);
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA);
      }
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        db.createObjectStore(STORE_BACKUPS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(key: string, storeName = STORE_KV): Promise<T | undefined> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

export async function idbSet<T>(key: string, value: T, storeName = STORE_KV): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      if (storeName === STORE_BACKUPS) {
        store.put(value);
      } else {
        store.put(value, key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IDB failure in restricted private mode
  }
}

// (2026-07-13) Add IndexedDB backup list & delete helpers vs single get/put
export async function idbGetAllBackups(): Promise<DailyBackupRecord[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BACKUPS, 'readonly');
      const store = tx.objectStore(STORE_BACKUPS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as DailyBackupRecord[];
        resolve(
          list
            .filter((b) => b && b.snapshot)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        );
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function idbDeleteBackup(id: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BACKUPS, 'readwrite');
      const store = tx.objectStore(STORE_BACKUPS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

function saveLightweightMirror(memories: KeepsakeMemory[]) {
  try {
    const lightweight = memories.slice(0, 150).map((m) => ({
      id: m.id,
      title: m.title,
      dateISO: m.dateISO,
      location: m.location,
      updatedAt: m.updatedAt,
    }));
    localStorage.setItem('ok_memories_mirror', JSON.stringify(lightweight));
  } catch {
    // Never throw QuotaExceededError
  }
}

class LocalDatabase {
  public ready: Promise<void>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ready = this.hydrateAll();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'ok_cross_tab_signal') {
          this.hydrateFromCrossTab();
        }
      });
    }
  }

  // (2026-07-13) Clean slate initialization without sample data vs seeded entries
  private async hydrateAll(): Promise<void> {
    const [savedMemories, savedNotes, savedLetters, savedProfile, savedCapsule] =
      await Promise.all([
        idbGet<KeepsakeMemory[]>('memories'),
        idbGet<SecretYearNote[]>('secretYearNotes'),
        idbGet<DigitalLoveLetter[]>('digitalLoveLetters'),
        idbGet<CoupleProfile>('coupleProfile'),
        idbGet<TimeCapsuleItem>('timeCapsule'),
      ]);

    // Purge any legacy sample mock data from local cache
    const hasSampleData =
      savedMemories?.some((m) => m.id.startsWith('mem-baker-beach')) ||
      savedNotes?.some((n) => n.id.startsWith('syn-')) ||
      savedLetters?.some((l) => l.id.startsWith('dll-'));

    if (hasSampleData) {
      memCache.memories = [];
      memCache.secretYearNotes = [];
      memCache.digitalLoveLetters = [];
      await Promise.all([
        idbSet('memories', []),
        idbSet('secretYearNotes', []),
        idbSet('digitalLoveLetters', []),
      ]);
      try {
        localStorage.removeItem('ok_memories_mirror');
      } catch {
        // Ignore
      }
    } else {
      // (2026-07-13) Strip dummy audioMemo lacking URL from memories; was showing VM
      const rawList = savedMemories && Array.isArray(savedMemories) ? savedMemories : [];
      memCache.memories = rawList.map((m) => {
        if (m.audioMemo && !m.audioMemo.url) {
          const { audioMemo, ...clean } = m;
          return clean as KeepsakeMemory;
        }
        return m;
      });
      memCache.secretYearNotes = savedNotes && Array.isArray(savedNotes) ? savedNotes : [];
      memCache.digitalLoveLetters = savedLetters && Array.isArray(savedLetters) ? savedLetters : [];
    }

    // (2026-07-13) Upgrade saved avatar to COUPLE_AVATAR_URL; was google placeholder
    if (savedProfile && savedProfile.partner1Name) {
      if (!savedProfile.avatarUrl || savedProfile.avatarUrl.includes('googleusercontent.com')) {
        savedProfile.avatarUrl = COUPLE_AVATAR_URL;
        await idbSet('coupleProfile', savedProfile);
      }
      memCache.coupleProfile = savedProfile;
    } else {
      await idbSet('coupleProfile', DEFAULT_COUPLE_PROFILE);
    }

    if (savedCapsule && savedCapsule.id) {
      memCache.timeCapsule = savedCapsule;
    } else {
      await idbSet('timeCapsule', CLEAN_TIME_CAPSULE);
    }

    // Ensure today's automated daily backup exists
    const todayISO = new Date().toISOString().slice(0, 10);
    const todayId = `daily_auto_${todayISO}`;
    const existingToday = await idbGet<DailyBackupRecord>(todayId, STORE_BACKUPS);
    if (!existingToday) {
      const autoSnap = this.createSnapshot();
      const autoRecord: DailyBackupRecord = {
        id: todayId,
        dateISO: todayISO,
        label: `Automated Daily Snapshot (${todayISO})`,
        createdAt: Date.now(),
        trigger: 'AUTO_DAILY',
        syncedToFirestore: false,
        memoriesCount: memCache.memories.length,
        lettersCount: memCache.digitalLoveLetters.length,
        notesCount: memCache.secretYearNotes.length,
        snapshot: autoSnap,
      };
      await idbSet(todayId, autoRecord, STORE_BACKUPS);
    }

    memCache.dailyBackups = await idbGetAllBackups();
    saveLightweightMirror(memCache.memories);
    this.notify();
  }

  async resetToCleanSlate(): Promise<void> {
    memCache.memories = [];
    memCache.secretYearNotes = [];
    memCache.digitalLoveLetters = [];
    memCache.timeCapsule = CLEAN_TIME_CAPSULE;
    await Promise.all([
      idbSet('memories', []),
      idbSet('secretYearNotes', []),
      idbSet('digitalLoveLetters', []),
      idbSet('timeCapsule', CLEAN_TIME_CAPSULE),
    ]);
    saveLightweightMirror([]);
    this.notify();
    this.signalCrossTab();
  }

  async restoreShowcaseArchive(): Promise<void> {
    await this.restoreSnapshot({
      version: '1.0.0',
      exportedAt: Date.now(),
      coupleProfile: DEFAULT_COUPLE_PROFILE,
      memories: INITIAL_MEMORIES,
      secretYearNotes: INITIAL_SECRET_YEAR_NOTES,
      digitalLoveLetters: INITIAL_DIGITAL_LOVE_LETTERS,
      timeCapsule: INITIAL_TIME_CAPSULE,
    });
  }

  private async hydrateFromCrossTab() {
    const [savedMemories, savedNotes, savedLetters, savedProfile, savedCapsule] =
      await Promise.all([
        idbGet<KeepsakeMemory[]>('memories'),
        idbGet<SecretYearNote[]>('secretYearNotes'),
        idbGet<DigitalLoveLetter[]>('digitalLoveLetters'),
        idbGet<CoupleProfile>('coupleProfile'),
        idbGet<TimeCapsuleItem>('timeCapsule'),
      ]);
    if (savedMemories) {
      memCache.memories = savedMemories.map((m) => {
        if (m.audioMemo && !m.audioMemo.url) {
          const { audioMemo, ...clean } = m;
          return clean as KeepsakeMemory;
        }
        return m;
      });
    }
    if (savedNotes) memCache.secretYearNotes = savedNotes;
    if (savedLetters) memCache.digitalLoveLetters = savedLetters;
    if (savedProfile) memCache.coupleProfile = savedProfile;
    if (savedCapsule) memCache.timeCapsule = savedCapsule;
    this.notify();
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public notify() {
    this.listeners.forEach((cb) => cb());
  }

  private signalCrossTab() {
    try {
      localStorage.setItem('ok_cross_tab_signal', String(Date.now()));
    } catch {
      // Ignore
    }
  }

  getMemories(): KeepsakeMemory[] {
    return memCache.memories;
  }

  async setMemories(memories: KeepsakeMemory[], fromRemote = false): Promise<void> {
    memCache.memories = memories;
    await idbSet('memories', memories);
    saveLightweightMirror(memories);
    this.notify();
    if (!fromRemote) {
      this.signalCrossTab();
    }
  }

  getSecretYearNotes(): SecretYearNote[] {
    return memCache.secretYearNotes;
  }

  async setSecretYearNotes(notes: SecretYearNote[], fromRemote = false): Promise<void> {
    memCache.secretYearNotes = notes;
    await idbSet('secretYearNotes', notes);
    this.notify();
    if (!fromRemote) {
      this.signalCrossTab();
    }
  }

  // (2026-07-13) Add getters/setters for digital love letters vs missing API
  getDigitalLoveLetters(): DigitalLoveLetter[] {
    return memCache.digitalLoveLetters;
  }

  async setDigitalLoveLetters(
    letters: DigitalLoveLetter[],
    fromRemote = false
  ): Promise<void> {
    memCache.digitalLoveLetters = letters;
    await idbSet('digitalLoveLetters', letters);
    this.notify();
    if (!fromRemote) {
      this.signalCrossTab();
    }
  }

  getCoupleProfile(): CoupleProfile {
    return memCache.coupleProfile;
  }

  async setCoupleProfile(profile: CoupleProfile, fromRemote = false): Promise<void> {
    memCache.coupleProfile = profile;
    await idbSet('coupleProfile', profile);
    this.notify();
    if (!fromRemote) {
      this.signalCrossTab();
    }
  }

  getTimeCapsule(): TimeCapsuleItem {
    return memCache.timeCapsule;
  }

  async setTimeCapsule(capsule: TimeCapsuleItem, fromRemote = false): Promise<void> {
    memCache.timeCapsule = capsule;
    await idbSet('timeCapsule', capsule);
    this.notify();
    if (!fromRemote) {
      this.signalCrossTab();
    }
  }

  getActiveTab(): ActiveTab {
    try {
      const saved = localStorage.getItem('ok_active_tab') as ActiveTab | null;
      if (saved && ['timeline', 'story', 'new-date', 'capsule', 'letters'].includes(saved)) {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'timeline';
  }

  setActiveTab(tab: ActiveTab) {
    try {
      localStorage.setItem('ok_active_tab', tab);
    } catch {
      // Ignore
    }
  }

  getSelectedMemoryId(): string {
    try {
      const saved = localStorage.getItem('ok_selected_memory_id');
      if (saved && memCache.memories.some((m) => m.id === saved)) {
        return saved;
      }
    } catch {
      // Ignore
    }
    return memCache.memories[0]?.id || 'mem-baker-beach-084';
  }

  setSelectedMemoryId(id: string) {
    try {
      localStorage.setItem('ok_selected_memory_id', id);
    } catch {
      // Ignore
    }
  }

  // (2026-07-13) Include digitalLoveLetters in snapshot backup/restore vs omitted
  createSnapshot(): BackupSnapshot {
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      coupleProfile: memCache.coupleProfile,
      memories: memCache.memories,
      secretYearNotes: memCache.secretYearNotes,
      digitalLoveLetters: memCache.digitalLoveLetters,
      timeCapsule: memCache.timeCapsule,
    };
  }

  async saveBackup(snapshot: BackupSnapshot): Promise<DailyBackupRecord> {
    const todayISO = new Date(snapshot.exportedAt || Date.now()).toISOString().slice(0, 10);
    const id = `daily_manual_${todayISO}_${snapshot.exportedAt}`;
    const record: DailyBackupRecord = {
      id,
      dateISO: todayISO,
      label: `Daily Vault Snapshot • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      createdAt: snapshot.exportedAt || Date.now(),
      trigger: 'MANUAL',
      syncedToFirestore: false,
      memoriesCount: snapshot.memories.length,
      lettersCount: snapshot.digitalLoveLetters?.length || 0,
      notesCount: snapshot.secretYearNotes.length,
      snapshot,
    };
    await idbSet(id, record, STORE_BACKUPS);
    memCache.dailyBackups = await idbGetAllBackups();
    this.notify();
    return record;
  }

  // (2026-07-13) Add createManualDailyBackup; was missing method
  async createManualDailyBackup(): Promise<DailyBackupRecord> {
    const snap = this.createSnapshot();
    return this.saveBackup(snap);
  }

  getDailyBackups(): DailyBackupRecord[] {
    return memCache.dailyBackups;
  }

  async upsertDailyBackupRecord(record: DailyBackupRecord): Promise<void> {
    await idbSet(record.id, record, STORE_BACKUPS);
    memCache.dailyBackups = await idbGetAllBackups();
    this.notify();
  }

  async deleteDailyBackupRecord(id: string): Promise<void> {
    await idbDeleteBackup(id);
    memCache.dailyBackups = await idbGetAllBackups();
    this.notify();
  }

  async restoreSnapshot(snapshot: BackupSnapshot): Promise<void> {
    if (snapshot.coupleProfile) {
      memCache.coupleProfile = snapshot.coupleProfile;
      await idbSet('coupleProfile', snapshot.coupleProfile);
    }
    if (Array.isArray(snapshot.memories)) {
      memCache.memories = snapshot.memories;
      await idbSet('memories', snapshot.memories);
      saveLightweightMirror(snapshot.memories);
    }
    if (Array.isArray(snapshot.secretYearNotes)) {
      memCache.secretYearNotes = snapshot.secretYearNotes;
      await idbSet('secretYearNotes', snapshot.secretYearNotes);
    }
    if (Array.isArray(snapshot.digitalLoveLetters)) {
      memCache.digitalLoveLetters = snapshot.digitalLoveLetters;
      await idbSet('digitalLoveLetters', snapshot.digitalLoveLetters);
    }
    if (snapshot.timeCapsule) {
      memCache.timeCapsule = snapshot.timeCapsule;
      await idbSet('timeCapsule', snapshot.timeCapsule);
    }
    try {
      localStorage.setItem('ok_sync_baseline', String(Date.now()));
    } catch {
      // Ignore
    }
    this.notify();
    this.signalCrossTab();
  }
}

export const DB = new LocalDatabase();

export function exportJSONSnapshot(snapshot: BackupSnapshot) {
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `our-keepsake-jp-zea-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSVSnapshot(snapshot: BackupSnapshot) {
  const headers = [
    'ID',
    'KeepsakeNo',
    'DateISO',
    'Title',
    'Location',
    'MoodVibe',
    'Tags',
    'QuoteHighlight',
    'StoryBody',
  ];
  const escapeCsv = (val: string | number | undefined) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };
  const rows = snapshot.memories.map((m) =>
    [
      m.id,
      m.keepsakeNumber,
      m.dateISO,
      m.title,
      m.location,
      m.moodVibe,
      m.vibeTags.join('; '),
      m.quoteHighlight,
      m.storyBody,
    ]
      .map(escapeCsv)
      .join(',')
  );
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `our-keepsake-jp-zea-memories-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportBothJSONandCSV(snapshot: BackupSnapshot) {
  await DB.saveBackup(snapshot);
  exportJSONSnapshot(snapshot);
  setTimeout(() => {
    exportCSVSnapshot(snapshot);
  }, 350);
}
