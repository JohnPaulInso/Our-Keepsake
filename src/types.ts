// (2026-07-13) Define core TypeScript interfaces per PRD & SKILL.md vs untyped
export type MemoryCategory = 'EVENT' | 'VOICE_MEMO' | 'PHOTO' | 'VIDEO' | 'ANNIVERSARY';
// (2026-07-13) Add BURGUNDY indicator for milestone & ROSE for intimacy; was 3 dots
export type DotIndicator = 'GOLD' | 'MOCHA' | 'ROSE' | 'BURGUNDY';

// (2026-07-13) Support video polaroids & poster thumbnail; was image only
export interface PolaroidPhoto {
  id: string;
  url: string;
  caption: string;
  aspectRatio?: string;
  tag?: string;
  mediaType?: 'image' | 'video';
  posterUrl?: string;
}

export interface AudioMemo {
  id: string;
  title: string;
  url?: string;
  durationSeconds: number;
  durationFormatted: string;
  waveformPeaks: number[];
  isFavorite?: boolean;
  synthNotes?: number[];
}

export interface VideoCapsule {
  id: string;
  title: string;
  url?: string;
  thumbnailUrl: string;
  durationFormatted: string;
  resolution?: string;
}

export interface PartnerReplyNote {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface KeepsakeMemory {
  id: string;
  keepsakeNumber: number;
  volumeNumber: number;
  dateISO: string; // YYYY-MM-DD
  timeFormatted: string;
  title: string;
  letterHeading?: string;
  snippet: string;
  storyBody: string;
  quoteHighlight: string;
  signOffAuthor: string;
  location: string;
  weatherTemp: string;
  weatherConditions: string;
  moodVibe: string;
  vibeTags: string[];
  categories: MemoryCategory[];
  dotIndicators: DotIndicator[];
  photos: PolaroidPhoto[];
  audioMemo?: AudioMemo;
  videoCapsule?: VideoCapsule;
  partnerNotes: PartnerReplyNote[];
  isSealed: boolean;
  isDraft?: boolean;
  sealLabel: string;
  sealIcon: string;
  lockedUntilISO?: string | null;
  updatedAt: number;
  sortOrder: number;
}

export interface SecretYearNote {
  id: string;
  monthLabel: string;
  dateISO: string;
  title: string;
  littleThingsNoted: string;
  whatSheSaid: string;
  secretThought: string;
  category: 'LITTLE_HABIT' | 'FUNNY_MOMENT' | 'QUIET_LOVE' | 'MILESTONE' | 'FAVORITE_THING';
  isFavorite: boolean;
  updatedAt: number;
}

export interface TimeCapsuleItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  unlockDateISO: string;
  passcode: string;
  isUnlocked: boolean;
  sealedLetters: {
    id: string;
    author: string;
    title: string;
    body: string;
    writtenDateISO: string;
  }[];
  secretVideoTitle: string;
  updatedAt: number;
}

export interface CoupleProfile {
  partner1Name: string; // JP
  partner2Name: string; // Zea
  relationshipStartDateISO: string;
  // (2026-07-13) Add meeting, courting, & anniversary dates; was single start date
  meetingDateISO?: string;
  courtingDateISO?: string;
  anniversaryDateISO?: string;
  chapterTitle: string;
  heroQuote: string;
  avatarUrl: string;
  nextRendezvousTitle: string;
  nextRendezvousDayLabel: string;
  nextRendezvousTimeLabel: string;
  nextRendezvousLocation: string;
  // (2026-07-13) Add milestone & rendezvous toggle; was next rendezvous only
  showNextRendezvous?: boolean;
  milestoneTitle?: string;
  milestoneDateLabel?: string;
  milestoneTag?: string;
  theme: 'light' | 'dark';
  updatedAt: number;
}

// (2026-07-13) Add DigitalLoveLetter interface vs secret notes only
export interface DigitalLoveLetter {
  id: string;
  letterNumber: number;
  title: string;
  occasion: string;
  dateISO: string;
  paperStatus: 'TRANSCRIBED_TO_PAPER' | 'DIGITAL_ORIGINAL' | 'WAX_SEALED_GIVEN';
  salutation: string;
  body: string;
  signOff: string;
  paperNotes?: string;
  isFavorite: boolean;
  updatedAt: number;
}

export interface BackupSnapshot {
  version: string;
  exportedAt: number;
  coupleProfile: CoupleProfile;
  memories: KeepsakeMemory[];
  secretYearNotes: SecretYearNote[];
  digitalLoveLetters?: DigitalLoveLetter[];
  timeCapsule: TimeCapsuleItem;
}

// (2026-07-13) Add DailyBackupRecord & FirebaseRuntimeConfig vs untyped backups
export interface DailyBackupRecord {
  id: string;
  dateISO: string;
  label: string;
  createdAt: number;
  trigger: 'AUTO_DAILY' | 'MANUAL' | 'SHOWCASE_ARCHIVE' | 'CLOUD_SYNC';
  syncedToFirestore: boolean;
  memoriesCount: number;
  lettersCount: number;
  notesCount: number;
  snapshot: BackupSnapshot;
}

// (2026-07-13) Add measurementId to FirebaseRuntimeConfig vs missing field
export interface FirebaseRuntimeConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

// (2026-07-13) Add notepad to ActiveTab union; was 5 tabs only
export type ActiveTab = 'timeline' | 'story' | 'new-date' | 'capsule' | 'letters' | 'notepad';
