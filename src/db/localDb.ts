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
  fullMemories: KeepsakeMemory[];
  secretYearNotes: SecretYearNote[];
  digitalLoveLetters: DigitalLoveLetter[];
  coupleProfile: CoupleProfile;
  timeCapsule: TimeCapsuleItem;
  dailyBackups: DailyBackupRecord[];
}

// (2026-07-13) Index seed memories & conflict rules so real edits never disappear
const SEED_BY_DATE = new Map<string, KeepsakeMemory>(
  INITIAL_MEMORIES.map((m) => [m.dateISO, m])
);

export function isUnmodifiedSeedMemory(m: KeepsakeMemory): boolean {
  if (!m) return false;
  const seed = SEED_BY_DATE.get(m.dateISO);
  if (!seed) return false;
  const sameBody = (m.storyBody || '').trim() === (seed.storyBody || '').trim();
  const sameTitle = (m.title || '').trim() === (seed.title || '').trim();
  const noExtraPhotos = (m.photos?.length || 0) <= (seed.photos?.length || 0);
  const noExtraNotes = (m.partnerNotes?.length || 0) <= (seed.partnerNotes?.length || 0);
  return m.id.endsWith('-imported') && sameBody && sameTitle && noExtraPhotos && noExtraNotes;
}

function getEffectiveMemoryTimestamp(m: KeepsakeMemory): number {
  if (isUnmodifiedSeedMemory(m)) return 1000;
  const raw = m.updatedAt || 0;
  // Clamp fake future timestamps inherited from seedMemories.ts (> now + 1 hour)
  const now = Date.now();
  if (raw > now + 3600000) {
    return 2000;
  }
  return raw > 0 ? raw : 2000;
}

export function mergeTwoMemoriesForDate(
  localMem: KeepsakeMemory,
  remoteMem: KeepsakeMemory
): KeepsakeMemory {
  const localIsSeed = isUnmodifiedSeedMemory(localMem);
  const remoteIsSeed = isUnmodifiedSeedMemory(remoteMem);

  // Merge photos preserving resolved data URLs and union by photo ID
  const localPhotos = localMem.photos || [];
  const remotePhotos = remoteMem.photos || [];
  const photoMap = new Map<string, KeepsakeMemory['photos'][0]>();
  for (const lp of localPhotos) {
    if (lp && lp.id) photoMap.set(lp.id, lp);
  }
  for (const rp of remotePhotos) {
    if (!rp || !rp.id) continue;
    const existing = photoMap.get(rp.id);
    if (!existing) {
      photoMap.set(rp.id, rp);
    } else if (
      (existing.url?.startsWith('split_media://') || !existing.url) &&
      rp.url &&
      !rp.url.startsWith('split_media://')
    ) {
      photoMap.set(rp.id, rp);
    } else if (!rp.url?.startsWith('split_media://') && rp.url) {
      photoMap.set(rp.id, { ...existing, caption: rp.caption || existing.caption });
    }
  }
  const mergedPhotos =
    photoMap.size > 0
      ? Array.from(photoMap.values())
      : localPhotos.length >= remotePhotos.length
      ? localPhotos
      : remotePhotos;

  // Merge partner notes by ID union
  const noteMap = new Map<string, KeepsakeMemory['partnerNotes'][0]>();
  for (const n of localMem.partnerNotes || []) {
    if (n && n.id) noteMap.set(n.id, n);
  }
  for (const n of remoteMem.partnerNotes || []) {
    if (n && n.id) noteMap.set(n.id, n);
  }
  const mergedNotes = Array.from(noteMap.values());

  // 1. User-modified memory ALWAYS beats unmodified seed memory
  if (localIsSeed && !remoteIsSeed) {
    return { ...remoteMem, photos: mergedPhotos, partnerNotes: mergedNotes };
  }
  if (remoteIsSeed && !localIsSeed) {
    return { ...localMem, photos: mergedPhotos, partnerNotes: mergedNotes };
  }

  // 2. Compare content length & timestamps so newly typed long memories never get overwritten
  const localLen = (localMem.storyBody || localMem.snippet || '').trim().length;
  const remoteLen = (remoteMem.storyBody || remoteMem.snippet || '').trim().length;
  const localTs = getEffectiveMemoryTimestamp(localMem);
  const remoteTs = getEffectiveMemoryTimestamp(remoteMem);

  // If one version has a significantly longer storyBody and was edited within 15 mins of the other, keep the longer story
  if (Math.abs(localLen - remoteLen) >= 20 && Math.abs(localTs - remoteTs) < 900000) {
    const winner = localLen >= remoteLen ? localMem : remoteMem;
    return {
      ...winner,
      photos: mergedPhotos,
      partnerNotes: mergedNotes,
      updatedAt: Math.max(localTs, remoteTs),
    };
  }

  const winner = localTs >= remoteTs ? localMem : remoteMem;
  return {
    ...winner,
    photos: mergedPhotos,
    partnerNotes: mergedNotes,
    updatedAt: Math.max(localTs, remoteTs),
  };
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

// (2026-07-13) Synchronously hydrate calendar dots & metadata from localStorage on boot
function loadInstantCachedMemories(): KeepsakeMemory[] {
  const byDate = new Map<string, KeepsakeMemory>();
  for (const m of INITIAL_MEMORIES) {
    if (m && m.dateISO) byDate.set(m.dateISO, m);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('ok_memories_instant_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.dateISO) {
              const existing = byDate.get(item.dateISO);
              const hydrated: KeepsakeMemory = {
                keepsakeNumber: item.keepsakeNumber ?? existing?.keepsakeNumber ?? 1,
                volumeNumber: item.volumeNumber ?? existing?.volumeNumber ?? 1,
                timeFormatted: item.timeFormatted || existing?.timeFormatted || 'All Day',
                letterHeading: item.letterHeading || item.title || existing?.letterHeading || '',
                snippet: item.snippet || existing?.snippet || '',
                storyBody: existing?.storyBody || item.snippet || '',
                quoteHighlight: item.quoteHighlight || existing?.quoteHighlight || '',
                signOffAuthor: item.signOffAuthor || existing?.signOffAuthor || 'bb John Paul',
                location: item.location || existing?.location || 'Bogo City, Cebu',
                weatherTemp: existing?.weatherTemp || '',
                weatherConditions: existing?.weatherConditions || '',
                moodVibe: existing?.moodVibe || '',
                vibeTags: Array.isArray(item.vibeTags) ? item.vibeTags : existing?.vibeTags || [],
                categories: Array.isArray(item.categories) ? item.categories : existing?.categories || ['EVENT'],
                dotIndicators: Array.isArray(item.dotIndicators) ? item.dotIndicators : existing?.dotIndicators || ['MOCHA'],
                photos: existing?.photos || [],
                partnerNotes: existing?.partnerNotes || [],
                isSealed: item.isSealed ?? existing?.isSealed ?? true,
                isDraft: item.isDraft ?? existing?.isDraft ?? false,
                sealLabel: item.sealLabel || existing?.sealLabel || 'Sealed Keepsake',
                sealIcon: item.sealIcon || existing?.sealIcon || 'favorite',
                sortOrder: item.sortOrder ?? existing?.sortOrder ?? 0,
                ...item,
              };
              byDate.set(item.dateISO, hydrated);
            }
          }
        }
      }
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return Array.from(byDate.values()).sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

const initialSortedFull = loadInstantCachedMemories();

const memCache: MemCacheShape = {
  memories: initialSortedFull,
  fullMemories: initialSortedFull,
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

// (2026-07-13) Cache lightweight dots & metadata in localStorage for 0ms APK boot
function saveLightweightMirror(memories: KeepsakeMemory[]) {
  try {
    const instantCache = memories.slice(0, 400).map((m) => ({
      id: m.id,
      dateISO: m.dateISO,
      title: m.title,
      letterHeading: m.letterHeading,
      snippet: m.snippet,
      quoteHighlight: m.quoteHighlight,
      location: m.location,
      timeFormatted: m.timeFormatted,
      dotIndicators: m.dotIndicators,
      categories: m.categories,
      vibeTags: m.vibeTags,
      isSealed: m.isSealed,
      isDraft: m.isDraft,
      sortOrder: m.sortOrder,
      updatedAt: m.updatedAt,
    }));
    localStorage.setItem('ok_memories_instant_cache', JSON.stringify(instantCache));
  } catch {
    // Never throw QuotaExceededError
  }
}

class LocalDatabase {
  public ready: Promise<void>;
  private listeners: Set<() => void> = new Set();
  // (2026-07-13) Separate user mutation listeners from passive UI hydration listeners
  private mutationListeners: Set<() => void> = new Set();
  private hasCompletedInitialStream = false;

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
      this.hasCompletedInitialStream = true;
      memCache.memories = [...memCache.fullMemories];
      onAllLoaded?.(memCache.fullMemories);
      return;
    }

    let cursor = 0;
    const CHUNK_SIZE = 16;

    const step = () => {
      const slice = deferred.slice(cursor, cursor + CHUNK_SIZE);
      cursor += CHUNK_SIZE;

      if (slice.length > 0) {
        const existingByDate = new Map(memCache.memories.map((m) => [m.dateISO, m]));
        for (const item of slice) {
          // Always pick the latest version from fullMemories in case user edited during stream
          const latest =
            memCache.fullMemories.find((fm) => fm.dateISO === item.dateISO) || item;
          const cur = existingByDate.get(latest.dateISO);
          if (!cur) {
            existingByDate.set(latest.dateISO, latest);
          } else {
            existingByDate.set(latest.dateISO, mergeTwoMemoriesForDate(cur, latest));
          }
        }
        memCache.memories = Array.from(existingByDate.values()).sort((a, b) =>
          b.dateISO.localeCompare(a.dateISO)
        );
        this.notify();
      }

      if (cursor < deferred.length) {
        this.backgroundStreamTimer = window.setTimeout(step, 55);
      } else {
        this.backgroundStreamTimer = null;
        this.hasCompletedInitialStream = true;
        memCache.memories = [...memCache.fullMemories];
        this.notify();
        onAllLoaded?.(memCache.fullMemories);
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

      // Stage 1: Store full list in fullMemories and preserve instant calendar dots immediately
      memCache.fullMemories = cleanedList;
      memCache.memories = cleanedList;
      this.hasCompletedInitialStream = true;
      if (fullMemoriesToPersist) {
        idbSet('memories', cleanedList);
      }
      saveLightweightMirror(cleanedList);
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

  // (2026-07-13) Subscribe only to explicit local user writes; was all notifications
  subscribeMutation(cb: () => void): () => void {
    this.mutationListeners.add(cb);
    return () => {
      this.mutationListeners.delete(cb);
    };
  }

  public notify() {
    this.listeners.forEach((cb) => cb());
  }

  public notifyMutation() {
    this.mutationListeners.forEach((cb) => cb());
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

  getFullMemories(): KeepsakeMemory[] {
    return memCache.fullMemories.length >= memCache.memories.length
      ? memCache.fullMemories
      : memCache.memories;
  }

  // (2026-07-13) Add date-indexed memory retrieval; was loading full list
  getMemoriesByDateSync(dateISO: string): KeepsakeMemory[] {
    return (this.getFullMemories() || []).filter((m) => m.dateISO === dateISO);
  }

  async getMemoriesByDate(dateISO: string): Promise<KeepsakeMemory[]> {
    const full = this.getFullMemories();
    if (full && full.length > 0) {
      return full.filter((m) => m.dateISO === dateISO);
    }
    const all = await idbGet<KeepsakeMemory[]>('memories');
    return (all || []).filter((m) => m.dateISO === dateISO);
  }

  // (2026-07-13) Smart merge per dateISO against fullMemories on save; was partial list
  async setMemories(memories: KeepsakeMemory[], fromRemote = false): Promise<void> {
    const map = new Map<string, KeepsakeMemory>();
    const incomingDates = new Set(memories.map((m) => m.dateISO));
    // Preserve any unstreamed memories from fullMemories if background stream is still active
    if (!this.hasCompletedInitialStream && memCache.fullMemories.length > memories.length) {
      for (const fm of memCache.fullMemories) {
        if (fm && fm.dateISO && !incomingDates.has(fm.dateISO)) {
          map.set(fm.dateISO, fm);
        }
      }
    }
    for (const m of memories) {
      if (m && m.dateISO) {
        const existing = map.get(m.dateISO);
        if (!existing) {
          map.set(m.dateISO, m);
        } else {
          map.set(m.dateISO, mergeTwoMemoriesForDate(existing, m));
        }
      }
    }
    const deduplicated = Array.from(map.values()).sort((a, b) =>
      b.dateISO.localeCompare(a.dateISO)
    );
    memCache.fullMemories = deduplicated;
    memCache.memories = deduplicated;
    this.hasCompletedInitialStream = true;
    await idbSet('memories', deduplicated);
    saveLightweightMirror(deduplicated);
    this.notify();
    if (!fromRemote) {
      this.notifyMutation();
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
      this.notifyMutation();
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
      this.notifyMutation();
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
      this.notifyMutation();
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
      this.notifyMutation();
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

  // (2026-07-13) Export fullMemories in createSnapshot so streaming never drops items
  createSnapshot(): BackupSnapshot {
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      coupleProfile: memCache.coupleProfile,
      memories: this.getFullMemories(),
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
    // (2026-07-13) Multi-device per-date merge protecting user edits & long memories
    if (Array.isArray(snapshot.memories)) {
      const existingLocal = this.getFullMemories() || [];
      const byDate = new Map<string, KeepsakeMemory>();

      for (const localMem of existingLocal) {
        if (localMem && localMem.dateISO) {
          byDate.set(localMem.dateISO, localMem);
        }
      }

      for (const remoteMem of snapshot.memories) {
        if (!remoteMem || !remoteMem.dateISO) continue;
        const localMem = byDate.get(remoteMem.dateISO);
        if (!localMem) {
          byDate.set(remoteMem.dateISO, remoteMem);
        } else {
          byDate.set(remoteMem.dateISO, mergeTwoMemoriesForDate(localMem, remoteMem));
        }
      }

      const finalMemories = Array.from(byDate.values()).sort((a, b) =>
        b.dateISO.localeCompare(a.dateISO)
      );
      memCache.fullMemories = finalMemories;

      if (this.hasCompletedInitialStream) {
        memCache.memories = finalMemories;
        this.notify();
        idbSet('memories', finalMemories);
        saveLightweightMirror(finalMemories);
      } else {
        const { priority, deferred } = partitionMemoriesByPriorityMonths(finalMemories);
        memCache.memories = priority;
        this.notify();
        this.streamOlderMemoriesInBackground(deferred, (allLoaded) => {
          idbSet('memories', allLoaded);
          saveLightweightMirror(allLoaded);
        });
      }
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
