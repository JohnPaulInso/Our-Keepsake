// (2026-07-13) Import bundled couple avatar asset; was literal root string
import couplePhotoUrl from '../assets/meandzea.png';
import {
  CoupleProfile,
  DigitalLoveLetter,
  KeepsakeMemory,
  SecretYearNote,
  TimeCapsuleItem,
} from '../types';

// (2026-07-13) Inline vector SVG for Capybara wax seal vs expiring external URL
export const CAPYBARA_SEAL_LOGO =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="w" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="%23a4836d"/><stop offset="60%" stop-color="%236e5240"/><stop offset="100%" stop-color="%23483325"/></radialGradient><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23ecc15a"/><stop offset="50%" stop-color="%23cca440"/><stop offset="100%" stop-color="%239a741e"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="url(%23w)"/><circle cx="50" cy="50" r="40" fill="none" stroke="url(%23g)" stroke-width="2.5" opacity="0.9"/><circle cx="50" cy="50" r="36" fill="%23563d2e" opacity="0.4"/><path d="M30 63 C28 57 30 51 36 48 C42 46 48 47 54 47 C62 47 68 50 72 55 C74 58 74 63 71 66 C68 68 62 68 50 68 C38 68 32 67 30 63 Z" fill="%23f6ede8"/><path d="M52 47 C52 43 54 39 58 37 C62 35 68 35 73 38 C76 40 77 44 77 48 C76 51 73 53 69 53 C64 53 58 51 52 47 Z" fill="%23f6ede8"/><circle cx="58" cy="36" r="2.5" fill="%23c4a28b"/><path d="M68 42 Q71 40 73 42" stroke="%23583f2f" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="75" cy="45" r="1.2" fill="%23583f2f"/><path d="M64 32 C64 29 61 27 59 29 C57 27 54 29 54 32 C54 35 59 38 59 38 C59 38 64 35 64 32 Z" fill="%23e25c5c"/></svg>';

// (2026-07-13) Set bundled couple avatar URL; was literal root string
export const COUPLE_AVATAR_URL = couplePhotoUrl;

export const DEFAULT_COUPLE_PROFILE: CoupleProfile = {
  partner1Name: 'JP',
  partner2Name: 'Zea',
  // (2026-07-13) Set courting Nov 7, meeting Sep 14, anniversary blank; was Sep 14
  relationshipStartDateISO: '2025-11-07',
  meetingDateISO: '2025-09-14',
  courtingDateISO: '2025-11-07',
  anniversaryDateISO: '',
  // (2026-07-13) Set chapterTitle to Chapter 2 arabic numeral; was Chapter II
  chapterTitle: 'Chapter 2 • JP & Zea',
  // (2026-07-13) Update heroQuote to prayer quote; was world heart quote
  heroQuote: "You're an answered prayer, baby.",
  avatarUrl: COUPLE_AVATAR_URL,
  nextRendezvousTitle: 'Sunset Picnic at Presidio with Zea',
  nextRendezvousDayLabel: 'This Sat',
  nextRendezvousTimeLabel: '5:30 PM',
  nextRendezvousLocation: 'Presidio Overlook Lawn',
  // (2026-07-13) Set milestone to Nov 7, 2025 courted her; was Sept 14 first hangout
  showNextRendezvous: false,
  milestoneTitle: 'The Day I Courted Her',
  milestoneDateLabel: 'Nov 7, 2025',
  milestoneTag: 'Milestone',
  theme: 'light',
  updatedAt: 1730000000000,
};

// (2026-07-13) Add imported August 2026 memories; was empty array
export const INITIAL_MEMORIES: KeepsakeMemory[] = [
  {
    id: 'mem-2026-08-08-imported',
    keepsakeNumber: 1,
    volumeNumber: 1,
    dateISO: '2026-08-08',
    timeFormatted: 'All Day',
    title: 'Prac Then Serve Nya Nangadto Ta Dakit',
    letterHeading: 'Prac Then Serve Nya Nangadto Ta Dakit',
    snippet: 'Prac then serve nya nangadto ta dakit 1st time nisupport kas ako pagduyog nya nag cogon night market nya nag 7 11 paghuman itik = quack kwek',
    storyBody: 'Prac then serve nya nangadto ta dakit 1st time nisupport kas ako pagduyog nya nag cogon night market nya nag 7 11 paghuman itik = quack kwek',
    quoteHighlight: '1st time nisupport kas ako pagduyog nya nag cogon night market',
    signOffAuthor: 'JP • St. 1',
    location: 'Dakit & Cogon, Bogo City',
    weatherTemp: '28°C',
    weatherConditions: 'Gentle Breeze',
    moodVibe: 'Joyful & Supportive',
    vibeTags: ['Date', 'First Time'],
    categories: [],
    dotIndicators: ['MOCHA'],
    photos: [],
    partnerNotes: [],
    isSealed: true,
    sealLabel: 'Sealed in Chapter 1 • JP & Zea',
    sealIcon: 'favorite',
    sortOrder: 1,
    updatedAt: 1786200000000,
  },
  {
    id: 'mem-2026-08-13-imported',
    keepsakeNumber: 2,
    volumeNumber: 1,
    dateISO: '2026-08-13',
    timeFormatted: 'All Day',
    title: 'Kuha DB Kuyog Mon, Nagjabee Ta',
    letterHeading: 'Kuha DB Kuyog Mon, Nagjabee Ta',
    snippet: 'Kuha db kuyog mon, nagjabee ta and just like the fries i promised you, successful inyo booth sa db, nya pag uli nihapit tag panta nag double date bbtime sa panta, kuot2 basa kaayo ako fingers and we kissed a lot, labad lang imo ulo so saddd, but id still kiss you and kuot you, muto nangadto tag patio nakuyawan ka, sorry wato natuyo kay nikalit lng kog bira open ang bintana, nya after prac adto ta city hall badminton, linuwaay ming kim',
    storyBody: 'Kuha db kuyog mon, nagjabee ta and just like the fries i promised you, successful inyo booth sa db, nya pag uli nihapit tag panta nag double date bbtime sa panta, kuot2 basa kaayo ako fingers and we kissed a lot, labad lang imo ulo so saddd, but id still kiss you and kuot you, muto nangadto tag patio nakuyawan ka, sorry wato natuyo kay nikalit lng kog bira open ang bintana, nya after prac adto ta city hall badminton, linuwaay ming kim',
    quoteHighlight: 'And just like the fries I promised you, successful inyo booth sa DB',
    signOffAuthor: 'JP • St. 1',
    location: 'Panta & City Hall, Bogo City',
    weatherTemp: '29°C',
    weatherConditions: 'Warm Evening',
    moodVibe: 'Intimate & Tender',
    vibeTags: ['Date', 'Deep Talks'],
    categories: [],
    dotIndicators: ['MOCHA'],
    photos: [],
    partnerNotes: [],
    isSealed: true,
    sealLabel: 'Sealed in Chapter 1 • JP & Zea',
    sealIcon: 'favorite',
    sortOrder: 2,
    updatedAt: 1786632000000,
  },
  {
    id: 'mem-2026-08-14-imported',
    keepsakeNumber: 3,
    volumeNumber: 1,
    dateISO: '2026-08-14',
    timeFormatted: 'All Day',
    title: 'Seminar Ni Fr Mon Sa Mga Choir',
    letterHeading: 'Seminar Ni Fr Mon Sa Mga Choir',
    snippet: 'Seminar ni fr mon sa mga choir, nag 7 11 dakit ta nya nag osave nagduwa tag poison² nya ulii',
    storyBody: 'Seminar ni fr mon sa mga choir, nag 7 11 dakit ta nya nag osave nagduwa tag poison² nya ulii',
    quoteHighlight: 'Nag 7 11 dakit ta nya nag osave nagduwa tag poison² nya ulii',
    signOffAuthor: 'JP • St. 1',
    location: '7-Eleven Dakit & Osave, Bogo City',
    weatherTemp: '27°C',
    weatherConditions: 'Peaceful Night',
    moodVibe: 'Playful & Sweet',
    vibeTags: ['Date', 'Laughter'],
    categories: [],
    dotIndicators: ['MOCHA'],
    photos: [],
    partnerNotes: [],
    isSealed: true,
    sealLabel: 'Sealed in Chapter 1 • JP & Zea',
    sealIcon: 'favorite',
    sortOrder: 3,
    updatedAt: 1786718400000,
  },
  {
    id: 'mem-2026-08-15-imported',
    keepsakeNumber: 4,
    volumeNumber: 1,
    dateISO: '2026-08-15',
    timeFormatted: 'All Day',
    title: 'Whole Day Seminar Sa SLMCB',
    letterHeading: 'Whole Day Seminar Sa SLMCB',
    snippet: 'Whole day seminar sa slmcb, nya dockside paghuman, nya serve bungtod chapel',
    storyBody: 'Whole day seminar sa slmcb, nya dockside paghuman, nya serve bungtod chapel',
    quoteHighlight: 'Whole day seminar sa slmcb, nya dockside paghuman, nya serve bungtod chapel',
    signOffAuthor: 'JP • St. 1',
    location: 'SLMCB, Dockside & Bungtod Chapel',
    weatherTemp: '30°C',
    weatherConditions: 'Sunny & Vibrant',
    moodVibe: 'Full Day Event & Service',
    vibeTags: ['First Time', 'Sweet Treats'],
    categories: ['EVENT'],
    dotIndicators: ['GOLD'],
    photos: [],
    partnerNotes: [],
    isSealed: true,
    sealLabel: 'Sealed in Chapter 1 • JP & Zea',
    sealIcon: 'favorite',
    sortOrder: 4,
    updatedAt: 1786804800000,
  },
];

export const INITIAL_SECRET_YEAR_NOTES: SecretYearNote[] = [];

export const INITIAL_TIME_CAPSULE: TimeCapsuleItem = {
  id: 'tc-anniversary-024',
  title: 'Anniversary Time Capsule',
  subtitle: 'Our Special Milestone',
  description:
    'Sealed for our special milestone. This digital vault holds our secret letters and vows.',
  unlockDateISO: '2026-12-25',
  passcode: '1014',
  isUnlocked: false,
  sealedLetters: [],
  secretVideoTitle: '',
  updatedAt: 1729200000000,
};

export const INITIAL_DIGITAL_LOVE_LETTERS: DigitalLoveLetter[] = [];
