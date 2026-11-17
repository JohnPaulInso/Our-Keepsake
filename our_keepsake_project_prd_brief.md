# Product Requirements Document (PRD) & Product Brief
## **Our Keepsake** — Romantic Date Journal & Anniversary Memory Vault

---

### 1. Executive Summary & Vision
**Our Keepsake** is an intimate, private mobile application designed for a couple to document, cherish, and revisit every romantic date and milestone of their relationship. 

Conceived with the visual elegance of luxury wedding invitation stationery and the intimacy of an heirloom leather journal, the app moves away from sterile utility calendars and cluttered social media feeds. It offers a warm, soft-brown oasis decorated with subtle capybara motifs, tactile deckle-edge cards, wax seals, audio waveform players, and polaroid scrapbook galleries.

---

### 2. User Persona & Emotional Goals
* **Target Audience:** Romantic couples looking for a dedicated private sanctuary to preserve memories.
* **Core Emotional Goals:**
  * **Intimacy & Warmth:** Create a cozy, non-performative space built strictly for two.
  * **Heirloom Longevity:** Treat every date and shared thought like a handwritten letter or wedding keepsake that withstands the test of time.
  * **Multi-Sensory Nostalgia:** Relive moments not just through text, but through candid voice whispers, ambient sounds, candid film polaroids, and motion reels.

---

### 3. Design System & Aesthetic Foundation
* **Theme Name:** Warm Linen & Capybara Keepsake
* **Color Palette:**
  * **Deep Mocha / Espresso (`#4A3B32`):** Primary branding, high-contrast typography, wax seals, and key interactive badges.
  * **Warm Linen / Parchment (`#FBF9F5` / `#F5F3EF`):** Surface backgrounds, envelope stationery cards, paper deckle edges.
  * **Soft Latte & Caramel (`#D4B296` / `#A88B74`):** Borders, secondary iconography, tags, and delicate hairline separators.
  * **Accent Rose Blush (`#C96B78`):** Anniversaries, milestones, love markers.
  * **Accent Warm Gold / Honey (`#E5A93C`):** Big events, countdown highlights, wax seal foil accents.
* **Typography:**
  * **Primary Headings:** Editorial Serif (*Playfair Display* / *Cormorant Garamond*) conveying timeless romance and vow-like gravitas.
  * **Body & Functional UI:** Warm humanist sans-serif (*Plus Jakarta Sans* / *Inter*) for effortless reading and journaling.
* **Motifs & Micro-Interactions:**
  * Custom **Capybara Wax Seal** crest embedded in headers, envelopes, and seals.
  * Subtle capybara watermark illustrations nestled gently into card backgrounds.
  * Deckle-edge card styling, taped polaroids, and linen drop shadows.

---

### 4. Key Feature Specifications & Screen Architecture

#### **Screen 1: Timeline & Date Calendar (Home)**
* **Header & Anniversary Counter:**
  * Dynamic counter: *"Together for [X] Days"* with romantic quote banners.
  * Upcoming rendezvous teaser card (e.g., *"Sunset Picnic at Presidio — This Sat 5:30 PM"*).
* **Interactive Monthly Calendar & Date Strip:**
  * Swipeable month-by-month calendar card with chevron navigation.
  * **Dot Status Taxonomy:**
    * 🟡 **Gold (`#E5A93C`):** Big Events & Rendezvous
    * 🟤 **Mocha Brown (`#5C4033`):** Photos & Audio Voice Memos
    * 🌸 **Rose Blush (`#C96B78`):** Anniversaries & Relationship Milestones
    * 🔘 **Warm Mocha Pill:** Currently Selected Day
  * Horizontal day-by-day week strip for quick tap selection.
* **Keepsake Memory Feed:**
  * Filter pills: `All Dates`, `Photos`, `Voice Memos`, `Milestones`.
  * Date cards styled as sealed envelopes with preview summaries, location tags, embedded polaroids, and instant audio snippets.

#### **Screen 2: Date Story Reader (Detail View)**
* **Editorial Letter Format:**
  * Elegant stationery layout with drop caps and heartfelt editorial prose.
  * Environmental metadata badges: Date, time, location, weather conditions (e.g., *"Crisp 58° • Clear Skies"*), and emotional vibe (*"Warm & Infinite"*).
  * Styled blockquotes for quotes said during the date.
* **Integrated Media Vault:**
  * **Voice Memo Player:** Dark mocha player with stereo waveform, timestamp scrubber, and sound mastering tags.
  * **Polaroid Scrapbook Film Strips:** Offset polaroids with handwritten captions and tape effects.
  * **Video Capsule:** Embedded 1080p HD cloud video player with custom play state.
* **Keepsake Actions:**
  * *"Leave a Note for Her"* reply drawer.
  * *"Export PDF"* for printing physical memory albums.
  * *"Set Lockscreen"* generator.

#### **Screen 3: New Date Memory Composer (Editor)**
* **Journaling Desk:**
  * Date picker and interactive location geotag input.
  * Title field and notebook-ruled textarea designed to prompt sentimental storytelling (*"Write down how she smiled, what she said..."*).
  * Sentiment and vibe tags (*First Time, Cozy Rainy Day, Deep Talks, Roadtrip, Laughter*).
* **Attachment Drawers:**
  * **Voice & Whisper Recorder:** One-tap live mic recording with real-time waveform visualizer and duration cap.
  * **Polaroids & Photo Vault:** Multi-photo uploader with polaroid preview frames and individual caption inputs.
  * **Motion Video Capsule:** Video uploader with client-side compression indicator (optimized for Firestore / Firebase Storage).
* **Action CTAs:**
  * Primary: *"Seal into Our Memory Box"* (triggers tactile wax seal stamp animation).
  * Secondary: *"Save Draft to Desk"*.

#### **Screen 4: Keepsake Archive & Media Vault (Vault / Capsule)**
* **Archive Statistics & Summary:**
  * Counters for total dates preserved, film photos, voice notes, and video reels.
* **"Hear Her Voice Again" Playlist:**
  * Dedicated audio vault listing all candid voice snippets with dates and duration.
* **Polaroid Scrapbook Wall & Video Vignettes:**
  * Visual masonry wall of all captured photos labeled by date/trip.
* **Anniversary Time Capsule:**
  * Ceremonial locked digital container sealed until a milestone date (e.g., *"Locked until Dec 25, 2024 — Our 2nd Anniversary"*).
  * Biometric or passcode lock for shared reveal moments.

---

### 5. Technical Architecture & Data Models

#### **Backend Recommendation (Firebase / Supabase):**
* **Authentication:** Shared couple account or dual-user account linked by a private pairing invite code.
* **Database (Cloud Firestore):**
  * `couples/`
    * `relationship_start_date`: Timestamp
    * `partner_1_profile`, `partner_2_profile`: User references
    * `anniversary_milestones`: Array of dates & titles
  * `couples/{coupleId}/memories/`
    * `id`: String (UUID)
    * `date`: Timestamp
    * `title`: String
    * `story_body`: Rich Markdown / String
    * `location`: GeoPoint & String
    * `weather_metadata`: Object (`temp`, `conditions`)
    * `vibe_tags`: Array<String>
    * `categories`: Array<Enum: `EVENT` | `VOICE_MEMO` | `PHOTO` | `ANNIVERSARY`>
    * `dot_indicators`: Array<Enum: `GOLD` | `MOCHA` | `ROSE`>
    * `photo_urls`: Array<Object: `{ url, caption, aspect_ratio }`>
    * `audio_memo`: Object `{ url, duration_seconds, waveform_peaks }`
    * `video_capsule`: Object `{ url, thumbnail_url, duration }`
    * `is_sealed`: Boolean
    * `locked_until`: Timestamp (Nullable for Time Capsules)

#### **Media Storage & Cost Optimization Strategy:**
* **Video Handling on Firestore / Cloud Storage:**
  * Implement client-side video transcode/compression (H.264 / 720p or 1080p, 30fps, capped at 60s clips) prior to upload to prevent cloud storage bloat.
  * Direct streaming URLs via Firebase Storage CDN or Cloudflare R2 for cost efficiency.
* **Audio Handling:**
  * Compress voice notes into lightweight `.aac` / `.m4a` format (~1-2MB per 3 minutes).

---

### 6. Roadmap & Future Horizons
* **Phase 1 (MVP - Built):** Timeline feed, monthly calendar with color-coded dot system, letter story reader, and multi-media memory composer.
* **Phase 2:** Physical album export (one-click photobook print integration), home screen iOS/Android widgets displaying "On this day last year" memories.
* **Phase 3:** Real-time push notifications ("Your partner sealed a surprise letter into the vault for tonight").
