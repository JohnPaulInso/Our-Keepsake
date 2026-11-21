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

// (2026-07-13) Partition memories into current/prev months first & background rest
function getPriorityMonthPrefixes(allMemories: KeepsakeMemory[]): Set<string> {
  const prefixes = new Set<string>();
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const prevY = curM === 1 ? curY - 1 : curY;
  const prevM = curM === 1 ? 12 : curM - 1;
  prefixes.add(`${curY}-${String(curM).padStart(2, '0')}`);
  prefixes.add(`${prevY}-${String(prevM).padStart(2, '0')}`);

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('ok_calendar_view_state') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.year === 'number' && typeof parsed.month === 'number') {
        const cy = parsed.year;
        const cm = parsed.month + 1;
        const py = cm === 1 ? cy - 1 : cy;
        const pm = cm === 1 ? 12 : cm - 1;
        prefixes.add(`${cy}-${String(cm).padStart(2, '0')}`);
        prefixes.add(`${py}-${String(pm).padStart(2, '0')}`);
      }
    }
  } catch {
    // Ignore
  }

  // Also include the 2 most recent distinct months present in the memories list
  const recentMonths = new Set<string>();
  for (let i = 0; i < allMemories.length; i++) {
    const ym = (allMemories[i].dateISO || '').slice(0, 7);
    if (ym.length === 7) {
      recentMonths.add(ym);
      prefixes.add(ym);
      if (recentMonths.size >= 2) break;
    }
  }
  return prefixes;
}

function partitionMemoriesByPriorityMonths(allMemories: KeepsakeMemory[]): {
  priority: KeepsakeMemory[];
  deferred: KeepsakeMemory[];
} {
  const sorted = [...allMemories].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  const priorityPrefixes = getPriorityMonthPrefixes(sorted);
  const priority: KeepsakeMemory[] = [];
  const deferred: KeepsakeMemory[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const ym = (m.dateISO || '').slice(0, 7);
    if (priorityPrefixes.has(ym) || m.dateISO === '2025-11-07') {
      priority.push(m);
    } else {
      deferred.push(m);
    }
  }
  return { priority, deferred };
}

const initialPartition = partitionMemoriesByPriorityMonths(INITIAL_MEMORIES);

const memCache: MemCacheShape = {
  memories: initialPartition.priority,
  secretYearNotes: [],
  digitalLoveLetters: INITIAL_DIGITAL_LOVE_LETTERS,
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

  private backgroundStreamTimer: number | null = null;

  // (2026-07-13) Stream older months in background chunks after priority months load
  private streamOlderMemoriesInBackground(
    deferred: KeepsakeMemory[],
    onAllLoaded?: (fullList: KeepsakeMemory[]) => void
  ): void {
    if (this.backgroundStreamTimer !== null) {
      clearTimeout(this.backgroundStreamTimer);
      this.backgroundStreamTimer = null;
    }
    if (deferred.length === 0) {
      onAllLoaded?.(memCache.memories);
      return;
    }

    let cursor = 0;
    const CHUNK_SIZE = 16;

    const step = () => {
      const slice = deferred.slice(cursor, cursor + CHUNK_SIZE);
      cursor += CHUNK_SIZE;

      if (slice.length > 0) {
        const existingDates = new Set(memCache.memories.map((m) => m.dateISO));
        const existingIds = new Set(memCache.memories.map((m) => m.id));
        const toAdd = slice.filter(
          (m) => !existingDates.has(m.dateISO) && !existingIds.has(m.id)
        );
        if (toAdd.length > 0) {
          memCache.memories = [...memCache.memories, ...toAdd].sort((a, b) =>
            b.dateISO.localeCompare(a.dateISO)
          );
          this.notify();
        }
      }

      if (cursor < deferred.length) {
        this.backgroundStreamTimer = window.setTimeout(step, 55);
      } else {
        this.backgroundStreamTimer = null;
        onAllLoaded?.(memCache.memories);
      }
    };

    this.backgroundStreamTimer = window.setTimeout(step, 55);
  }

  // (2026-07-13) Fast 2-stage boot: current/prev months first, background rest
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

    let fullMemoriesToPersist: KeepsakeMemory[] | null = null;
    let lettersUpdated = false;

    if (hasSampleData) {
      memCache.memories = [];
      memCache.secretYearNotes = [];
      memCache.digitalLoveLetters = [];
      Promise.all([
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
      const rawList = savedMemories && Array.isArray(savedMemories) ? savedMemories : [];
      const cleanedList = rawList.map((m) => {
        if (m.audioMemo && (!m.audioMemo.url || m.audioMemo.url.startsWith('mock-') || !m.audioMemo.url.trim())) {
          const { audioMemo, ...clean } = m;
          return clean as KeepsakeMemory;
        }
        return m;
      });
      memCache.secretYearNotes = savedNotes && Array.isArray(savedNotes) ? savedNotes : [];
      memCache.digitalLoveLetters = savedLetters && Array.isArray(savedLetters) ? savedLetters : [];

      let memoriesUpdated = false;
      const existingDates = new Set(cleanedList.map((m) => m.dateISO));
      for (const item of INITIAL_MEMORIES) {
        if (!existingDates.has(item.dateISO)) {
          cleanedList.push(item);
          existingDates.add(item.dateISO);
          memoriesUpdated = true;
        }
      }
      cleanedList.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
      if (memoriesUpdated) {
        fullMemoriesToPersist = cleanedList;
      }

      for (const letter of INITIAL_DIGITAL_LOVE_LETTERS) {
        const existingIdx = memCache.digitalLoveLetters.findIndex((l) => l.id === letter.id);
        if (existingIdx === -1) {
          memCache.digitalLoveLetters.push(letter);
          lettersUpdated = true;
        }
      }

      // Stage 1: Load ONLY current & previous months immediately for zero-lag first paint
      const { priority, deferred } = partitionMemoriesByPriorityMonths(cleanedList);
      memCache.memories = priority;

      // Stage 2: Stream remaining older months in non-blocking background chunks
      this.streamOlderMemoriesInBackground(deferred, (allLoaded) => {
        if (fullMemoriesToPersist) {
          idbSet('memories', allLoaded);
        }
        saveLightweightMirror(allLoaded);
      });
    }

    if (savedProfile && savedProfile.partner1Name) {
      if (
        !savedProfile.avatarUrl ||
        savedProfile.avatarUrl.includes('googleusercontent.com') ||
        savedProfile.avatarUrl.includes('meandzea') ||
        savedProfile.avatarUrl.includes('localhost') ||
        savedProfile.avatarUrl.startsWith('/assets/')
      ) {
        savedProfile.avatarUrl = COUPLE_AVATAR_URL;
      }
      if (!savedProfile.heroQuote || savedProfile.heroQuote.includes('no heart for me like yours')) {
        savedProfile.heroQuote = "You're an answered prayer, baby.";
      }
      if (
        savedProfile.showNextRendezvous === undefined ||
        savedProfile.milestoneDateLabel === 'Sep 14, 2025' ||
        !savedProfile.milestoneTitle ||
        savedProfile.milestoneTitle.includes('First Chapter')
      ) {
        savedProfile.showNextRendezvous = false;
        savedProfile.milestoneTitle = 'The Day I Courted Her';
        savedProfile.milestoneDateLabel = 'Nov 7, 2025';
        savedProfile.milestoneTag = 'Milestone';
      }
      savedProfile.meetingDateISO = '2025-09-14';
      savedProfile.courtingDateISO = '2025-11-07';
      savedProfile.anniversaryDateISO = '';
      savedProfile.relationshipStartDateISO = '2025-11-07';
      if (!savedProfile.chapterTitle || savedProfile.chapterTitle.includes('Chapter II') || savedProfile.chapterTitle.includes('Chapter 11')) {
        savedProfile.chapterTitle = 'Chapter 2 • JP & Zea';
      }
      memCache.coupleProfile = savedProfile;
    }

    if (savedCapsule && savedCapsule.id) {
      memCache.timeCapsule = savedCapsule;
    }

    // Notify listeners right away so first paint happens immediately
    this.notify();

    // Stage 3: Defer heavy IDB writes and daily backup checks to idle background
    setTimeout(async () => {
      try {
        if (lettersUpdated) {
          await idbSet('digitalLoveLetters', memCache.digitalLoveLetters);
        }
        await idbSet('coupleProfile', memCache.coupleProfile);
        if (!savedCapsule || !savedCapsule.id) {
          await idbSet('timeCapsule', CLEAN_TIME_CAPSULE);
        }
        const todayISO = new Date().toISOString().slice(0, 10);
        const todayId = `daily_auto_${todayISO}`;
        const existingToday = await idbGet<DailyBackupRecord>(todayId, STORE_BACKUPS);
        if (!existingToday && memCache.memories.length > 0) {
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
        this.notify();
      } catch {
        // Ignore background maintenance error
      }
    }, 2400);
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
      // (2026-07-13) Filter mock audio URLs from memories; was retaining mock audio
      memCache.memories = savedMemories.map((m) => {
        if (m.audioMemo && (!m.audioMemo.url || m.audioMemo.url.startsWith('mock-') || !m.audioMemo.url.trim())) {
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

  // (2026-07-13) Add date-indexed memory retrieval; was loading full list
  getMemoriesByDateSync(dateISO: string): KeepsakeMemory[] {
    return (memCache.memories || []).filter((m) => m.dateISO === dateISO);
  }

  async getMemoriesByDate(dateISO: string): Promise<KeepsakeMemory[]> {
    if (memCache.memories && memCache.memories.length > 0) {
      return memCache.memories.filter((m) => m.dateISO === dateISO);
    }
    const all = await idbGet<KeepsakeMemory[]>('memories');
    return (all || []).filter((m) => m.dateISO === dateISO);
  }

  // (2026-07-13) Deduplicate memories by dateISO on save; was raw array write
  async setMemories(memories: KeepsakeMemory[], fromRemote = false): Promise<void> {
    const map = new Map<string, KeepsakeMemory>();
    for (const m of memories) {
      if (m && m.dateISO) {
        const existing = map.get(m.dateISO);
        if (!existing || (m.updatedAt || 0) >= (existing.updatedAt || 0)) {
          map.set(m.dateISO, m);
        }
      }
    }
    const deduplicated = Array.from(map.values()).sort((a, b) =>
      b.dateISO.localeCompare(a.dateISO)
    );
    memCache.memories = deduplicated;
    await idbSet('memories', deduplicated);
    saveLightweightMirror(deduplicated);
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
      if (saved && ['timeline', 'story', 'new-date', 'capsule', 'letters', 'notepad'].includes(saved)) {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'timeline';
  }

  // (2026-07-13) Add monthly notepad storage helpers; was missing notepad API
  getMonthlyNotepad(monthKey: string): string | null {
    try {
      return localStorage.getItem(`ok_monthly_notepad_${monthKey}`);
    } catch {
      return null;
    }
  }

  setMonthlyNotepad(monthKey: string, content: string): void {
    try {
      localStorage.setItem(`ok_monthly_notepad_${monthKey}`, content);
      idbSet(`notepad_${monthKey}`, content);
    } catch {
      // Ignore
    }
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
      // (2026-07-13) Normalize snapshot avatar URL; was raw localhost / assets path
      if (
        !snapshot.coupleProfile.avatarUrl ||
        snapshot.coupleProfile.avatarUrl.includes('googleusercontent.com') ||
        snapshot.coupleProfile.avatarUrl.includes('meandzea') ||
        snapshot.coupleProfile.avatarUrl.includes('localhost') ||
        snapshot.coupleProfile.avatarUrl.startsWith('/assets/')
      ) {
        snapshot.coupleProfile.avatarUrl = COUPLE_AVATAR_URL;
      }
      memCache.coupleProfile = snapshot.coupleProfile;
      await idbSet('coupleProfile', snapshot.coupleProfile);
    }
    // (2026-07-13) Preserve local edits and photos on remote merge; was overwrite
    if (Array.isArray(snapshot.memories)) {
      const existingLocal = memCache.memories || [];
      const remoteIds = new Set(snapshot.memories.map((m) => m.id));
      const remoteDates = new Set(snapshot.memories.map((m) => m.dateISO));
      const localOnly = existingLocal.filter((m) => !remoteIds.has(m.id) && !remoteDates.has(m.dateISO));

      const merged = snapshot.memories.map((remoteMem) => {
        const localMem = existingLocal.find((m) => m.id === remoteMem.id || m.dateISO === remoteMem.dateISO);
        if (!localMem) return remoteMem;

        const localPhotos = localMem.photos || [];
        const remotePhotos = remoteMem.photos || [];

        // If local has photos but remote has none, or local was updated more recently: preserve local photos
        const shouldKeepLocalPhotos =
          (localPhotos.length > 0 && remotePhotos.length === 0) ||
          ((localMem.updatedAt || 0) >= (remoteMem.updatedAt || 0) && localPhotos.length > 0);

        // Resolve any split_media:// or missing URLs using local cache
        const resolvedPhotos = remotePhotos.map((rp) => {
          if (rp.url?.startsWith('split_media://') || !rp.url) {
            const matchedLocal = localPhotos.find((lp) => lp.id === rp.id);
            if (matchedLocal?.url) {
              return { ...rp, url: matchedLocal.url };
            }
          }
          return rp;
        });

        const finalPhotos = shouldKeepLocalPhotos
          ? localPhotos
          : (resolvedPhotos.length > 0 ? resolvedPhotos : localPhotos);

        if ((localMem.updatedAt || 0) >= (remoteMem.updatedAt || 0)) {
          return { ...localMem, photos: finalPhotos };
        }
        return { ...remoteMem, photos: finalPhotos };
      });

      const finalMemories = [...merged, ...localOnly];
      // (2026-07-13) Apply priority months first & stream older months in background
      const { priority, deferred } = partitionMemoriesByPriorityMonths(finalMemories);
      memCache.memories = priority;
      this.notify();
      this.streamOlderMemoriesInBackground(deferred, (allLoaded) => {
        idbSet('memories', allLoaded);
        saveLightweightMirror(allLoaded);
      });
    }
    // (2026-07-13) Merge remote with unpushed local notes vs hard overwrite
    if (Array.isArray(snapshot.secretYearNotes)) {
      const existingLocalNotes = memCache.secretYearNotes || [];
      const remoteNoteIds = new Set(snapshot.secretYearNotes.map((n) => n.id));
      const localOnlyNotes = existingLocalNotes.filter((n) => !remoteNoteIds.has(n.id));
      const mergedNotes = [...snapshot.secretYearNotes, ...localOnlyNotes];
      memCache.secretYearNotes = mergedNotes;
      await idbSet('secretYearNotes', mergedNotes);
    }
    // (2026-07-13) Merge remote with unpushed local letters vs hard overwrite
    if (Array.isArray(snapshot.digitalLoveLetters)) {
      const existingLocalLetters = memCache.digitalLoveLetters || [];
      const remoteLetterIds = new Set(snapshot.digitalLoveLetters.map((l) => l.id));
      const localOnlyLetters = existingLocalLetters.filter((l) => !remoteLetterIds.has(l.id));
      const mergedLetters = [...snapshot.digitalLoveLetters, ...localOnlyLetters];
      memCache.digitalLoveLetters = mergedLetters;
      await idbSet('digitalLoveLetters', mergedLetters);
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
