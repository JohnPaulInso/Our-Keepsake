# Graph Report - Our Keepsake  (2026-11-18)

## Corpus Check
- 83 files · ~133,039 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .xml 10, (none) 4, .bat 3)

## Summary
- 278 nodes · 633 edges · 22 communities (8 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Project Configuration & DevDependencies
- UI Dropdowns & Memory View Components
- Couple Profile & Initial Seed Data
- IndexedDB Local Storage Engine
- React Application Architecture & Routing
- Firebase Cloud Sync Manager
- TypeScript Configuration & Compiler Options
- Capacitor Mobile Runtime Dependencies
- Android Instrumentation & Unit Tests
- Keepsake Audio Player & Synth Engine
- Image Cropping & High-Res Uploads
- Android Native Bridge & Activity

## God Nodes (most connected - your core abstractions)
1. `LocalDatabase` - 34 edges
2. `CoupleProfile` - 23 edges
3. `KeepsakeMemory` - 22 edges
4. `FirebaseSyncManager` - 19 edges
5. `App()` - 18 edges
6. `formatStandardDate()` - 17 edges
7. `compilerOptions` - 16 edges
8. `react` - 15 edges
9. `idbSet()` - 15 edges
10. `SecretYearNote` - 13 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `CapsuleVaultView()`  [EXTRACTED]
  src/App.tsx → src/views/CapsuleVaultView.tsx
- `App()` --calls--> `MonthlyNotepadView()`  [EXTRACTED]
  src/App.tsx → src/views/MonthlyNotepadView.tsx
- `App()` --calls--> `TimelineView()`  [EXTRACTED]
  src/App.tsx → src/views/TimelineView.tsx
- `CoupleStudioModalProps` --references--> `CoupleProfile`  [EXTRACTED]
  src/components/CoupleStudioModal.tsx → src/types.ts
- `SecretYearLettersView()` --calls--> `CustomDropdown()`  [EXTRACTED]
  src/views/SecretYearLettersView.tsx → src/components/CustomDropdown.tsx

## Import Cycles
- None detected.

## Communities (22 total, 14 thin omitted)

### Community 0 - "Project Configuration & DevDependencies"
Cohesion: 0.05
Nodes (38): config, devDependencies, autoprefixer, postcss, tailwindcss, @types/react, @types/react-dom, typescript (+30 more)

### Community 1 - "UI Dropdowns & Memory View Components"
Cohesion: 0.12
Nodes (26): CustomDropdown(), CustomDropdownProps, DropdownOption, AudioMemo, DotIndicator, KeepsakeMemory, MemoryCategory, PartnerReplyNote (+18 more)

### Community 2 - "Couple Profile & Initial Seed Data"
Cohesion: 0.11
Nodes (25): CoupleStudioModalProps, COUPLE_AVATAR_URL, DEFAULT_COUPLE_PROFILE, INITIAL_DIGITAL_LOVE_LETTERS, INITIAL_MEMORIES, INITIAL_SECRET_YEAR_NOTES, INITIAL_TIME_CAPSULE, CLEAN_TIME_CAPSULE (+17 more)

### Community 3 - "IndexedDB Local Storage Engine"
Cohesion: 0.14
Nodes (9): idbDeleteBackup(), idbGet(), idbGetAllBackups(), idbSet(), LocalDatabase, openIndexedDB(), saveLightweightMirror(), ActiveTab (+1 more)

### Community 4 - "React Application Architecture & Routing"
Cohesion: 0.16
Nodes (23): react, react-dom, react-router-dom, App(), CoupleStudioModal(), PinLockModal(), PinLockModalProps, ToastContainer() (+15 more)

### Community 6 - "TypeScript Configuration & Compiler Options"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 7 - "Capacitor Mobile Runtime Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/ios, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+7 more)

### Community 10 - "Image Cropping & High-Res Uploads"
Cohesion: 0.47
Nodes (3): ImageCropperModal(), ImageCropperModalProps, uploadOptimizedImage()

## Knowledge Gaps
- **12 isolated node(s):** `@capacitor/android`, `@capacitor/core`, `@capacitor/ios`, `framer-motion`, `lucide-react` (+7 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 101 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `React Application Architecture & Routing` to `Project Configuration & DevDependencies`, `UI Dropdowns & Memory View Components`, `Image Cropping & High-Res Uploads`, `Couple Profile & Initial Seed Data`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `@capacitor/android`, `@capacitor/core`, `@capacitor/ios` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Configuration & DevDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Capacitor Mobile Runtime Dependencies` to `Project Configuration & DevDependencies`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `UI Dropdowns & Memory View Components` be split into smaller, more focused modules?**
  _Cohesion score 0.11711711711711711 - nodes in this community are weakly interconnected._
- **Why does `FirebaseSyncManager` connect `Firebase Cloud Sync Manager` to `React Application Architecture & Routing`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Should `Couple Profile & Initial Seed Data` be split into smaller, more focused modules?**
  _Cohesion score 0.10756302521008404 - nodes in this community are weakly interconnected._