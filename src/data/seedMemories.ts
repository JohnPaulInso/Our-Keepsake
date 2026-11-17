// (2026-07-13) Create initial keepsakes & JP's secret year notes for Zea
// (2026-07-13) Add DigitalLoveLetter import vs missing letter type
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

export const INITIAL_MEMORIES: KeepsakeMemory[] = [
  {
    id: 'mem-baker-beach-084',
    keepsakeNumber: 84,
    volumeNumber: 14,
    dateISO: '2026-10-14',
    timeFormatted: '9:42 PM PST',
    title: 'Baker Beach Stargazing',
    letterHeading: 'Under the Milky Way, Wrapped in Your Brown Sweater',
    snippet:
      'Wrapped tight inside your oversized oatmeal knit sweater, shivering slightly while watching Orion rise over the Pacific waves... You made instant hot cocoa in the thermos.',
    storyBody:
      'I still remember the salt air in your hair when we climbed onto the sand dunes, Zea. You were shivering so I wrapped my arms around you inside that thick wool sweater. We did not talk for almost twenty minutes—just watching the Pacific waves crash against the Golden Gate fog.\n\nThe bonfires down the shoreline had died out into glowing cedar embers, leaving just us and the endless tide. When you turned around to laugh at how soaked my cuffs had gotten, your eyes caught the amber harbor beacon—a memory that is forever embossed into my heart.',
    quoteHighlight:
      'You whispered that this felt like forever, and I knew right then I wanted every forever with you.',
    signOffAuthor: 'JP • St. 14',
    location: 'Baker Beach • San Francisco, CA',
    weatherTemp: 'Crisp 58°',
    weatherConditions: 'Clear Skies',
    moodVibe: 'Warm & Infinite',
    vibeTags: ['Deep Talks', 'Cozy Night', 'Stargazing', 'Zea Laughing'],
    categories: ['EVENT', 'PHOTO', 'VOICE_MEMO', 'VIDEO', 'ANNIVERSARY'],
    dotIndicators: ['GOLD', 'MOCHA'],
    photos: [
      {
        id: 'ph-baker-1',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0_Oq15Q14vICNpz52rAzAmq8QAIS1c9dBAgJMFwGmfMAsJQW9AndtSOhdwE5I1RfljR9Nn3qBQKbP4Cz890GlfcQY3Et55jALi-JGX-9cXf7me8jRMxGTGXeKimlvZbqd7gTXhibEz-QCQkf9rlMjWrmf5DMEjrLw8rE6FH9LMVbXMG3eVQZP5CQbLLzMTGMHe-6rNdTj-W-vb0bIosA3M-nQaW5RdMI5CHwl_4_Y',
        caption: 'Wrapped in our wool blanket by the lantern light',
        tag: 'BAKER BEACH',
      },
      {
        id: 'ph-baker-2',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFblZJRGuOuyeGWg8PpWYC2q6eREH9bICM-5mqQZGZwims8eKp4X7q5aNkIm6f7D2PbgWEAmnCAUAWZNedlkMry3PARphKIBfU2_FJ9DfoWiWmXwPR9y8yeNQhszkmS4lBbau0K0zGoJtqsjoaE8hEvQlIHV7376q88o6CKOyxmyXK7INL6WCnzCTrx2ijse4OsMhx0R86EbgY3dZOQ0VrW7gAAmNX2Bb9fNtSHkSO',
        caption: 'us freezing on the dunes',
        tag: 'DUNES',
      },
      {
        id: 'ph-baker-3',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIOMGt5Qcm-jpy1fsyw0h1MjSzdhK0a_q8eIDiH_kSsFuvk87OgGuIg3eGaP3om9m1t0XrV-_TMF8y65WlWtMMxep8-N6_PEpC4BBDPLPFOGr9jLjdC4Sav9fp3jbN607oPIewqctGITOEdTCKT_D-PnxdtoN2bhb-eg7KGoIuA25OjVzYDOVPRgGPii1Trzkt_JQrXHueO4NVsRf4g6iuwr0eXDCW4_PVsRjtV266',
        caption: 'your sweetest smile under the lantern light',
        tag: 'ZEA',
      },
    ],
    audioMemo: {
      id: 'aud-baker-1',
      title: 'Her laughing at the icy waves',
      durationSeconds: 84,
      durationFormatted: '01:24',
      waveformPeaks: [35, 60, 90, 45, 80, 70, 100, 80, 45, 70, 90, 80, 55, 90, 35, 70, 55, 25],
      isFavorite: true,
      synthNotes: [261.63, 329.63, 392.0, 523.25, 493.88, 392.0, 329.63, 293.66],
    },
    videoCapsule: {
      id: 'vid-baker-1',
      title: 'Running away from the high tide (18s)',
      thumbnailUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBcxixWa-77zl3_L67lGD09tSmyzq_0ALlWwl-Vln09llNee3V9ERkEb9Qh9u87OqZVpbx53KLA6w90ChWpPJ8rwigp6dBunIegGPkzhZBSZ9KCSkbC9MqyLoGo0NN4xKwpkB3AD7qxkNdwqTjHcl-SHg7WXc2M-i8eOJFeisjxDUNdCMvVJTLni5CJaD6Cz_s7qbQx7M_ZIhYr_w7cgKfOlKukdju_0bwRJ6HPKINY',
      durationFormatted: '0:18',
      resolution: '1080p HD',
    },
    partnerNotes: [
      {
        id: 'pn-1',
        author: 'JP',
        text: 'Secret note for Zea: You did not notice me writing this on my phone while you were pouring the second cup of cocoa, but seeing you that happy made my whole year.',
        createdAt: 1728945000000,
      },
    ],
    isSealed: true,
    sealLabel: 'Sealed in Chapter II',
    sealIcon: 'spa',
    updatedAt: 1728945000000,
    sortOrder: 1,
  },
  {
    id: 'mem-bookshop-matcha-081',
    keepsakeNumber: 81,
    volumeNumber: 13,
    dateISO: '2026-09-28',
    timeFormatted: '3:15 PM PST',
    title: 'Autumn Bookshop & Matcha',
    letterHeading: 'Rain on the Antique Window Pane & Poetry in the Basement',
    snippet:
      'You uncovered that dog-eared 1970s poetry collection in the basement corner and softly read paragraph 4 while the rain tapped gently against the antique window pane.',
    storyBody:
      'We ducked into Green Apple Books just as the September drizzle turned into a steady autumn rain. You went straight to the wooden stairs that creak on the third step—the exact spot you always gravitate toward.\n\nTwenty minutes later, I found you sitting cross-legged by the poetry shelf with two books balanced on your knees. Afterward, we walked next door for warm oat-milk matcha lattes, and you drew a tiny capybara on my paper napkin while telling me about your week.',
    quoteHighlight:
      'If we ever have our own house, I want a library corner that smells exactly like this rainy afternoon.',
    signOffAuthor: 'JP • St. 13',
    location: 'Green Apple Books • Inner Richmond',
    weatherTemp: 'Rainy 61°',
    weatherConditions: 'Soft Autumn Drizzle',
    moodVibe: 'Cozy & Literary',
    vibeTags: ['Cozy Rainy Day', 'Matcha', 'Bookstore', 'Poetry'],
    categories: ['PHOTO', 'VIDEO'],
    dotIndicators: ['MOCHA'],
    photos: [
      {
        id: 'ph-matcha-1',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDW0a0t22Ca1wrnqHG-9BnuFtEnAO4_1EsdR_ZdnxNTvrPcYbKlAAMVbQg995FPju3etO9u6nghSW83ZKIss40owjWbQi9CSupZQHGAn8pXCNRFKbj2KQWGBZAm3x63rauL5T03xj_j67Tp9JIbzZ-YFOpX-W2bWtUJ0ou5FkfM4GZiU-j2q8hp3FAHh_5K196ERfogU5fUXitkUgvkwBoDg20VuiMQowdBKJTJpULg',
        caption: 'Warm ceramic cups of matcha latte & vintage poetry',
        tag: 'MATCHA',
      },
      {
        id: 'ph-matcha-2',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAS1WCJYUidFIttdmHXMnVcTTQe7myeJORfaXSQzQtpxZBdCfsFeyAfCJEiU-kOA0tazz8uQfKuEhLsyctdkyc4YZtWmxOIy1rxU1OQT9EmOTWpsurJg7GT6VHQHF5sMEGrAZ1blJvRGQUn-QRDf95Qx7elf18JfSTsH4G0rEKk9Vtco0BgopzIz-bwhh8XaqYNydU8X1bteVMSRoyLM7uSdGSz3qRrIvKLsH0v-pNy',
        caption: 'Zea smiling warmly between the wooden bookshelves',
        tag: 'BOOKSHOP',
      },
      {
        id: 'ph-matcha-3',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAOXzQOGwF2CYKNFaR-QjMcV7FAGBilFMfYTZL6sNFldieolONPGdIEb6x9r-B87hEIGpsRqcMkYU5hj8wiyqwAzIYeRy1uCBdMy5WERUGwbbIwkLSrA8L0Qd5O81Hj5QVbbGxWoGinksP9WGjzAZI_QtxVx_0YbB6dSr0zJqmB2muD2cQqaSHgLGQlJnBx6MFS-LYLA6YZjfCsOvQb9khGGTQTONTpGRb876VyEbM',
        caption: 'She loved the cardamom bun by the rain-streaked window',
        tag: 'CAFE',
      },
    ],
    videoCapsule: {
      id: 'vid-matcha-1',
      title: 'Browsing the poetry stacks in your camel coat (18s)',
      thumbnailUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAS1WCJYUidFIttdmHXMnVcTTQe7myeJORfaXSQzQtpxZBdCfsFeyAfCJEiU-kOA0tazz8uQfKuEhLsyctdkyc4YZtWmxOIy1rxU1OQT9EmOTWpsurJg7GT6VHQHF5sMEGrAZ1blJvRGQUn-QRDf95Qx7elf18JfSTsH4G0rEKk9Vtco0BgopzIz-bwhh8XaqYNydU8X1bteVMSRoyLM7uSdGSz3qRrIvKLsH0v-pNy',
      durationFormatted: '0:18',
      resolution: '1080p HD',
    },
    partnerNotes: [
      {
        id: 'pn-2',
        author: 'JP',
        text: 'I secretly bought that 1970s poetry book the next morning so I could give it to you with this journal.',
        createdAt: 1727560000000,
      },
    ],
    isSealed: true,
    sealLabel: '2 Curated Keepsakes',
    sealIcon: 'sentiment_satisfied',
    updatedAt: 1727560000000,
    sortOrder: 2,
  },
  {
    id: 'mem-rainy-pasta-076',
    keepsakeNumber: 76,
    volumeNumber: 12,
    dateISO: '2026-09-12',
    timeFormatted: '8:10 PM PST',
    title: 'Rainy Night Homemade Pasta',
    letterHeading: 'Flour on Your Nose & Chet Baker on the Turntable',
    snippet:
      'Flour smudged across your nose, Chet Baker spinning softly on the vinyl player, and three failed attempts at shaping tortellini that still tasted like magic.',
    storyBody:
      'We promised we would make fresh pasta from scratch without looking at a tutorial, and within ten minutes the kitchen counter looked like a snowstorm of 00 flour. You insisted on kneading the dough while humming along to Chet Baker.\n\nEven though half our tortellini unfolded in the boiling water, sitting on the kitchen floor eating warm sage butter pasta out of ceramic bowls with you was better than any Michelin restaurant on earth.',
    quoteHighlight:
      'Our tortellini might look like little clouds, but they are our clouds.',
    signOffAuthor: 'JP • St. 12',
    location: 'Our Little Kitchen',
    weatherTemp: 'Cozy 68°',
    weatherConditions: 'Midnight Rain Outside',
    moodVibe: 'Playful & Domestic',
    vibeTags: ['Cozy Rainy Day', 'Laughter', 'Cooking Together', 'Vinyl'],
    categories: ['VOICE_MEMO', 'PHOTO', 'VIDEO'],
    dotIndicators: ['MOCHA', 'ROSE'],
    photos: [
      {
        id: 'ph-pasta-1',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSZFBONCDbeRyLQpAlCkwImgDMssvo2G5EKp1N3m2srb51cNUqt60rJ90t90zTYWXsQb-lEHBOVV3nljvSGZpDT4bgr-bGnMiRGlMX0BQvmcg67xPyTJX7L9nS21J4fj_sfWUG0XrJN7FTqMkpAUekEQp-uRCpPiSXRT1PLRcis3it4lue6QXOXxsZ205W9aGLoa5JNRgmthaJ7i5HMeTCpmuNJ0ZYhGdBziM0_kOg',
        caption: 'Flour-dusted kitchen & our handmade pasta Sunday',
        tag: 'KITCHEN',
      },
      {
        id: 'ph-pasta-2',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYhI2O2CbQPJXIJas4Fts4Y4Zp1bf5WIimfD1RRzFlvUyve56rbVmPdfwpWQP6X7gyTW72ZLvAOoQIf4f4tb7DE8YCk3PrxU7Xooyt1CNZt2vN-F0Vb5m6g7wTQsRWtcX8Ibbj57Tme7h4tZqCRXpGpvJdwq44rpqy6pBPO68dnse4Dc12gVKzrsitM2EcOpWCD7iMFqi2ReJkIQ9yTrMHx_ypi9kA-jD66zYnypXJ',
        caption: 'Holding hands across the wooden table after dinner',
        tag: 'US',
      },
    ],
    audioMemo: {
      id: 'aud-pasta-1',
      title: 'Vinyl crackle & midnight boiling pots',
      durationSeconds: 165,
      durationFormatted: '02:45',
      waveformPeaks: [85, 45, 65, 75, 95, 60, 45, 75, 35, 90, 50, 65, 80, 40, 95, 50],
      isFavorite: true,
      synthNotes: [293.66, 369.99, 440.0, 587.33, 554.37, 440.0, 369.99, 329.63],
    },
    videoCapsule: {
      id: 'vid-pasta-1',
      title: 'Pasta Sunday in our flour-dusted kitchen (45s)',
      thumbnailUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCSZFBONCDbeRyLQpAlCkwImgDMssvo2G5EKp1N3m2srb51cNUqt60rJ90t90zTYWXsQb-lEHBOVV3nljvSGZpDT4bgr-bGnMiRGlMX0BQvmcg67xPyTJX7L9nS21J4fj_sfWUG0XrJN7FTqMkpAUekEQp-uRCpPiSXRT1PLRcis3it4lue6QXOXxsZ205W9aGLoa5JNRgmthaJ7i5HMeTCpmuNJ0ZYhGdBziM0_kOg',
      durationFormatted: '0:45',
      resolution: '1080p HD',
    },
    partnerNotes: [],
    isSealed: true,
    sealLabel: 'Recipe & Voice Note',
    sealIcon: 'dinner_dining',
    updatedAt: 1726176000000,
    sortOrder: 3,
  },
  {
    id: 'mem-highway1-coastal-068',
    keepsakeNumber: 68,
    volumeNumber: 10,
    dateISO: '2026-08-22',
    timeFormatted: '6:20 PM PST',
    title: 'Highway 1 Coastal Drive & Big Sur Sunset',
    letterHeading: 'Windows Down, Golden Cliffs, and Your Favorite Playlist',
    snippet:
      'Singing at the top of your lungs with the convertible windows rolled down along Bixby Bridge while the Pacific turned molten gold.',
    storyBody:
      'We left early in the morning with iced coffees and no strict itinerary. Every time a coastal turnout appeared, you asked to pull over just to watch the sea otters and the mist curling around the redwoods.\n\nWhen the sun dipped toward the horizon near Big Sur, I hit record on my phone just to capture you singing in the passenger seat with the ocean wind in your hair.',
    quoteHighlight:
      'Promise me we will never stop taking the scenic route together.',
    signOffAuthor: 'JP • St. 10',
    location: 'Big Sur • Highway 1, CA',
    weatherTemp: 'Breezy 66°',
    weatherConditions: 'Golden Hour Glow',
    moodVibe: 'Free & Radiant',
    vibeTags: ['Roadtrip', 'Laughter', 'First Time', 'Sunset'],
    categories: ['EVENT', 'VOICE_MEMO', 'PHOTO', 'VIDEO'],
    dotIndicators: ['GOLD', 'MOCHA'],
    photos: [
      {
        id: 'ph-bigsur-1',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGoedxKtqET8sE4KCnZfgrxy3sK8NN4zbwQ1o1NaN63XF1zTG3h6ecd7SLny3V_Q0t5FPwHqD1PPlMNakdFLMozM5aEFfe91p3gDylvMT3xb34H9ehANUH1kqBJI60BgkjWRjz2juFomf17HAG9gU_monh2R1yaSwlhOj3FWjyawVjuExuPsw4jlYqIRLWKTAoEItyr9KZi8rBTEUMNTX0XsMrQmb2n6M5IPRobnZO',
        caption: 'Waves crashing gently against the Big Sur cliffs at sunset',
        tag: 'BIG SUR',
      },
      {
        id: 'ph-bigsur-2',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDA5pyX2Wv5H9GJg4tRmBwcg2Sp_yzAzCTFtWiNWJvFlBbyD6TQfOa_a1zc3_d8IWiOLv7gmNVT2AcX0ZXDN7I60ryxTZBbWootzYOroXkJIm80QxFDPipcJvPfd6vHfrFV6MJAMmXT842Xm2jBiIB8gG-2OPzzIYN3dppgmGdEzU_tKXCaz5Hb3bI1q3BZrYn-jhlRfI-yEbU5wXsR63r1NbFXMSpJMW_ACMhaKJNh',
        caption: 'Twirling under the string lights after our seaside dinner',
        tag: 'SEASIDE',
      },
    ],
    audioMemo: {
      id: 'aud-highway-1',
      title: 'Singing in the Car on Highway 1',
      durationSeconds: 75,
      durationFormatted: '01:15',
      waveformPeaks: [30, 55, 85, 45, 70, 30, 75, 85, 45, 60, 75, 30, 45, 20, 30],
      isFavorite: true,
      synthNotes: [329.63, 392.0, 493.88, 659.25, 587.33, 493.88, 392.0, 349.23],
    },
    videoCapsule: {
      id: 'vid-highway-1',
      title: 'Big Sur Sunset & Beach Dance under string lights (32s)',
      thumbnailUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDA5pyX2Wv5H9GJg4tRmBwcg2Sp_yzAzCTFtWiNWJvFlBbyD6TQfOa_a1zc3_d8IWiOLv7gmNVT2AcX0ZXDN7I60ryxTZBbWootzYOroXkJIm80QxFDPipcJvPfd6vHfrFV6MJAMmXT842Xm2jBiIB8gG-2OPzzIYN3dppgmGdEzU_tKXCaz5Hb3bI1q3BZrYn-jhlRfI-yEbU5wXsR63r1NbFXMSpJMW_ACMhaKJNh',
      durationFormatted: '0:32',
      resolution: '1080p HD',
    },
    partnerNotes: [],
    isSealed: true,
    sealLabel: 'Coastal Roadtrip',
    sealIcon: 'directions_car',
    updatedAt: 1724360000000,
    sortOrder: 4,
  },
  {
    id: 'mem-summer-meadow-054',
    keepsakeNumber: 54,
    volumeNumber: 8,
    dateISO: '2026-10-03',
    timeFormatted: '4:50 PM PST',
    title: 'Golden Meadow & Bakery Laughs',
    letterHeading: 'Wildflowers in Your Sun Hat & Pistachio Gelato',
    snippet:
      'Before the autumn breeze rolled in, we wandered through the wildflower meadow and laughed hysterically at the corner bakery until our stomachs hurt.',
    storyBody:
      'You wore that woven linen sun hat you almost left in the car, and when the golden hour light hit the wildflowers, you looked like a painting from another century.\n\nOn the walk back, we stopped for pistachio gelato and flaky pastries, and you laughed so hard at my attempt to pronounce the Italian pastry name that pistachio smudge ended up right on the tip of your nose.',
    quoteHighlight:
      'Every ordinary afternoon with you turns into my favorite memory of the year.',
    signOffAuthor: 'JP • St. 08',
    location: 'Botanical Meadow & Tartine Bakery',
    weatherTemp: 'Golden 72°',
    weatherConditions: 'Warm Sunbeams',
    moodVibe: 'Sunlit & Joyful',
    vibeTags: ['Laughter', 'Anniversary', 'First Time', 'Sweet Treats'],
    categories: ['PHOTO', 'VOICE_MEMO', 'ANNIVERSARY'],
    dotIndicators: ['ROSE', 'MOCHA'],
    photos: [
      {
        id: 'ph-meadow-1',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpDn2aDjxW2vb-i5-EyBb_ebbgyZT-XkTXPmKkaMlUMzTmdl3e09-khyulHb0UZCEPg_qgNjh_G7h6DFwHvTmMl01kO8_5wY937WsYY3sAg_uKc2k4bCwoZ2CBC2VblbP9s7LMfKTGxvyx1t4NZi1USCIVBocp2rnju4AREQVMa4Y882K-YQ5jImxYhV2yYPY15qvvdoehNUkRfRyMpMBBpM_Kk90ki2kNz_Vka-Ra',
        caption: 'Before the summer storm in your linen sun hat',
        tag: 'MEADOW',
      },
      {
        id: 'ph-meadow-2',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJRcdxEwAzU8m4Chlj7khqtAICIxqkmy4Elo8eQFVPmp_0HP58pg-2RWEFw8bXOhXJIlj8689c38NgcOWWB98-RXyKlJSZaZIH_-FYlDg7iW4jwlgZnyYhSBz2Wxy_oIdWt8EALF15rqz973cGSfa57mDhRj0RWFxr6XAi9AgGX2wPMMQ3Lx9k3e6USPCdixBFyXnUCtpPC9Y3ak_3j1cJXCGvkk_OAS69YZmOa2_j',
        caption: 'Pistachio all over your nose',
        tag: 'ROME CAFE',
      },
      {
        id: 'ph-meadow-3',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBv4i_U_yJ4MXB1U7YD1a5EebXthQhXXzrisYt1WTfENBNDshev4_bmFREAc0Vi0_P4_fsv865uz9PnrL7gwlEQtHXX-EYWoGlZk0q8tpHlmwYa8T7dEWAupBmDcJUpLaP-oSOJuJSabBtqr_aJMNJYTiZ1YdzpgLXjEokyReTbOUOZq6WT64tE4bJ48p30rOiaHrvKDwJTZRZvZ8BeB0pxGCEe6ag2y55_RKCEBjQF',
        caption: 'Getting lost on bicycles by the wooden bridge',
        tag: 'KYOTO',
      },
      {
        id: 'ph-meadow-4',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdayI-82MKB9uc5Quc_GQGcMx3azgK06nD-is0HsfwQQZcNaj0mNSz9-3h1HGdX_5mRfcP-fcDpw7Ee012dL3S9Di2TzQReYDOOFKi-JmqsSYaik1FRy2aSH-8Dmcn8aU3eKCQHdgtw73xmv9riBCDff8CaIGLxyw52j2ELHekKbPGHyCVz85qTMQwJQMcv2eAvWyYSVP6c8RZVzliwxflQtLKXYXCApz6tl7yVGs0',
        caption: 'Cold toes & warm morning coffee under cashmere',
        tag: 'RAINY SUN',
      },
    ],
    audioMemo: {
      id: 'aud-bakery-1',
      title: 'Her laughing hysterically at the bakery',
      durationSeconds: 128,
      durationFormatted: '02:08',
      waveformPeaks: [45, 90, 75, 90, 60, 90, 75, 45, 75, 30, 60, 30, 20],
      isFavorite: false,
      synthNotes: [349.23, 440.0, 523.25, 698.46, 659.25, 523.25, 440.0, 392.0],
    },
    partnerNotes: [],
    isSealed: true,
    sealLabel: 'Golden Milestone',
    sealIcon: 'stars',
    updatedAt: 1727980000000,
    sortOrder: 5,
  },
];

export const INITIAL_SECRET_YEAR_NOTES: SecretYearNote[] = [
  {
    id: 'syn-1',
    monthLabel: 'Month 1 • When I Started Secretly Writing This',
    dateISO: '2025-11-18',
    title: 'The Way Zea Holds Her Warm Mug With Both Hands',
    littleThingsNoted:
      'Whenever Zea gets a warm matcha or hot chocolate, she always closes her eyes for two full seconds on the very first sip and taps her boots together under the table.',
    whatSheSaid: '“Wait, do not drink yours yet, let us cheers our mugs first!”',
    secretThought:
      'That was the exact afternoon I decided to keep a secret log of everything that happens between us for an entire year so you could see yourself through my eyes.',
    category: 'LITTLE_HABIT',
    isFavorite: true,
    updatedAt: 1731900000000,
  },
  {
    id: 'syn-2',
    monthLabel: 'Month 3 • Winter Rain & Late Night Calls',
    dateISO: '2026-01-24',
    title: 'Falling Asleep on FaceTime While Planning Our Trips',
    littleThingsNoted:
      'You insisted you were wide awake at 1:15 AM while showing me places you wanted us to visit, and within three minutes your voice got super soft and sleepy.',
    whatSheSaid: '“I am not sleepy at all, I am just resting my eyelashes...”',
    secretThought:
      'I stayed on the line for another twenty minutes just listening to the quiet and feeling grateful that I get to be the person you fall asleep talking to.',
    category: 'QUIET_LOVE',
    isFavorite: true,
    updatedAt: 1737700000000,
  },
  {
    id: 'syn-3',
    monthLabel: 'Month 6 • Spring Blossoms & Inside Jokes',
    dateISO: '2026-04-12',
    title: 'Why Capybaras Became Our Official Mascot',
    littleThingsNoted:
      'Every time we saw a picture of a capybara sitting peacefully with a yuzu fruit on its head, you said it looked like us whenever we are cozy and unbothered together.',
    whatSheSaid: '“Look at him, zero stress, just warm water and snacks—that is literally our relationship goal.”',
    secretThought:
      'That is why I designed this entire keepsake journal with a custom Capybara wax seal just for you.',
    category: 'FUNNY_MOMENT',
    isFavorite: true,
    updatedAt: 1744400000000,
  },
  {
    id: 'syn-4',
    monthLabel: 'Month 9 • Summer Sunsets & Hand Squeezes',
    dateISO: '2026-07-19',
    title: 'The Three-Squeeze Secret Code',
    littleThingsNoted:
      'Whenever we are walking in a crowded place or crossing a street, you squeeze my hand three times fast without even looking up.',
    whatSheSaid: '“Three squeezes means I love you, four squeezes means I am hungry.”',
    secretThought:
      'Spoiler: ninety percent of the time, you follow the three squeezes with a fourth squeeze five seconds later.',
    category: 'FAVORITE_THING',
    isFavorite: true,
    updatedAt: 1752900000000,
  },
  {
    id: 'syn-5',
    monthLabel: 'Month 12 • One Full Year of Secret Notes',
    dateISO: '2026-11-16',
    title: 'Revealing This Secret Journal to Zea Today',
    littleThingsNoted:
      'For the past 365 days, every time you laughed at a terrible joke, wore my sweater, or told me about a dream, I quietly wrote it down right here.',
    whatSheSaid: '“Why are you smiling at your phone like that?”',
    secretThought:
      'Now you finally know why, Zea. Every single day of this past year with you was worth preserving forever.',
    category: 'MILESTONE',
    isFavorite: true,
    updatedAt: 1763260000000,
  },
];

export const INITIAL_TIME_CAPSULE: TimeCapsuleItem = {
  id: 'tc-anniversary-024',
  title: 'Anniversary Time Capsule',
  subtitle: 'Our Special Milestone',
  description:
    'Sealed on our trip to the coast. This digital vault holds our secret letters and vows for our milestone celebration.',
  unlockDateISO: '2026-12-25',
  passcode: '1014',
  isUnlocked: false,
  sealedLetters: [
    {
      id: 'sl-1',
      author: 'JP',
      title: 'To Zea, On the Night We Open Our Capsule',
      body: 'My dearest Zea,\n\nWhen I sealed this letter into our vault, I was thinking about all the little moments from this past year that you did not even realize I was writing down. Thank you for being my peace, my favorite laugh, and my home. No matter how many years pass, I will always look at you the way I did at Baker Beach under the stars.\n\nForever yours,\nJP',
      writtenDateISO: '2026-10-14',
    },
    {
      id: 'sl-2',
      author: 'JP & Zea',
      title: 'Our Bucket List & Promises for Next Year',
      body: '1. Take a train trip with window seats and warm pastries.\n2. Cook three new recipes from scratch on rainy Sundays.\n3. Take at least two Polaroid frames every month for our physical scrapbook.\n4. Always keep our three-squeeze hand code alive.',
      writtenDateISO: '2026-10-18',
    },
  ],
  secretVideoTitle: 'Unseen Montage: 365 Seconds of Zea Smiling This Year',
  updatedAt: 1729200000000,
};

// (2026-07-13) Add initial digital love letter drafts before paper vs none
export const INITIAL_DIGITAL_LOVE_LETTERS: DigitalLoveLetter[] = [
  {
    id: 'dll-1',
    letterNumber: 1,
    title: 'Before I Wrote It on Cream Linen Paper',
    occasion: 'First Handwritten Letter Draft',
    dateISO: '2025-10-14',
    paperStatus: 'TRANSCRIBED_TO_PAPER',
    salutation: 'My dearest Zea,',
    body: 'I am typing this out first because my hands always get a little nervous when I want every word on the physical paper to be worthy of you.\n\nFrom the very first week we started talking, the noise of everything else quieted down. You have this effortless warmth that makes ordinary Tuesdays feel like holidays. When you hold this paper version in your hands, know that I rewrote it until the ink looked just right—because you deserve something you can keep forever.',
    signOff: 'All my love, always,\nJP',
    paperNotes: 'Written with dark espresso ink on deckle-edge cream cotton stationery.',
    isFavorite: true,
    updatedAt: 1728900000000,
  },
  {
    id: 'dll-2',
    letterNumber: 2,
    title: 'Midnight Draft Before Our Monthsary Envelope',
    occasion: 'Quiet Rainy Night Letter',
    dateISO: '2026-02-14',
    paperStatus: 'WAX_SEALED_GIVEN',
    salutation: 'To my favorite person, Zea,',
    body: 'It is past midnight and I have my blank stationery sheet sitting right beside my keyboard. Before I copy this onto paper and stamp the wax seal, I wanted a digital copy saved safely in our vault.\n\nThank you for every laugh in the car, every three-squeeze hand signal when we walk through a crowd, and every gentle look across the table. Loving you is the easiest and best part of my life.',
    signOff: 'Yours in every chapter,\nJP',
    paperNotes: 'Tucked inside a warm hazelnut envelope with a gold wax seal and dried baby breath.',
    isFavorite: true,
    updatedAt: 1739500000000,
  },
  {
    id: 'dll-3',
    letterNumber: 3,
    title: 'One Full Year of Us — The Unabridged Digital Copy',
    occasion: 'Anniversary & Secret Year Reveal',
    dateISO: '2026-11-16',
    paperStatus: 'TRANSCRIBED_TO_PAPER',
    salutation: 'My sweetest Zea,',
    body: 'Every letter I ever handed you on paper started right here as a digital draft where I poured my heart out first. Alongside the physical letters you keep in your drawer, you now have every single digital original—plus a whole year of secret notes I wrote whenever you were not looking.\n\nHere is to a lifetime more of letters, both on screen and on paper.',
    signOff: 'Forever and ever,\nJP',
    paperNotes: 'Presented alongside Our Keepsake digital sanctuary.',
    isFavorite: true,
    updatedAt: 1763260000000,
  },
];
