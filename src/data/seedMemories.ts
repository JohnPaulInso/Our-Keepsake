// (2026-07-13) Empty initial sample data arrays vs hardcoded sample entries
import {
  CoupleProfile,
  DigitalLoveLetter,
  KeepsakeMemory,
  SecretYearNote,
  TimeCapsuleItem,
} from '../types';

export const CAPYBARA_SEAL_LOGO =
  'https://lh3.googleusercontent.com/aida/ALJJyrD34HtA0M1b1pSjw3h4VTAS0-O1pblcCJjpuvvtstU4p0d3yo5Lf7z-nabHEkhE7q9J3Uz6NmOll5eU4S_sqY35Jdp3p1mhnUZcKAs7XoRpGrC6PSpttT_1LbRMFWXaO0yJp_sj_p0W3HyuJywzvTTKMkcuq2Vg_f4ZM2tQjf7MYVTo3dhlsJXlazMDBvWM3r8QVQy8x8HkbNqakXrxXSci9kZBtpnPeW1Y9jgnnCK_';

export const COUPLE_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAGIAAQquVsdqqaTe5Zsfwa9O621DX8FMiLbNzodi9yYpF-30GVabRFuaqKJ5f3X7IUQbNUe7QlBnyhFmN_lbFG8vMVR89V-Umh1qBn9LDHijkyZmgvTCs1Vyh3h7-oX5VbKpb5ot7d-x5IzkruII557r8CExCLbPWvR5IaLLcIL1rVvBfWT0n3XDLSycnpbQIRqsoLT7aywpb03JhNefpa7Eqny29JVLPRwxpjIAYw';

export const DEFAULT_COUPLE_PROFILE: CoupleProfile = {
  partner1Name: 'JP',
  partner2Name: 'Zea',
  relationshipStartDateISO: '2025-09-14',
  chapterTitle: 'Chapter II • JP & Zea',
  heroQuote: 'In all the world, there is no heart for me like yours, Zea.',
  avatarUrl: COUPLE_AVATAR_URL,
  nextRendezvousTitle: 'Sunset Picnic at Presidio with Zea',
  nextRendezvousDayLabel: 'This Sat',
  nextRendezvousTimeLabel: '5:30 PM',
  nextRendezvousLocation: 'Presidio Overlook Lawn',
  theme: 'light',
  updatedAt: 1730000000000,
};

export const INITIAL_MEMORIES: KeepsakeMemory[] = [];

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
