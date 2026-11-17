# Graph Report - Our Keepsake  (2026-11-18)

## Corpus Check
- 80 files · ~127,631 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .xml 10, (none) 3, .bat 3)

## Summary
- 269 nodes · 612 edges · 20 communities (6 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Firebase Cloud Sync
- Audio Engine & Playback
- IndexedDB Local Store
- Android Platform & Build
- Firebase Cloud Sync
- Build & Tooling Config
- Android Platform & Build
- Android Platform & Build
- Audio Engine & Playback
- Android Platform & Build

## God Nodes (most connected - your core abstractions)
1. `LocalDatabase` - 34 edges
2. `CoupleProfile` - 23 edges
3. `KeepsakeMemory` - 22 edges
4. `FirebaseSyncManager` - 19 edges
5. `formatStandardDate()` - 18 edges
6. `App()` - 17 edges
7. `compilerOptions` - 16 edges
8. `idbSet()` - 15 edges
9. `react` - 14 edges
10. `SecretYearNote` - 13 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `CoupleStudioModal()`  [EXTRACTED]
  src/App.tsx → src/components/CoupleStudioModal.tsx
- `App()` --calls--> `BackupVaultPage()`  [EXTRACTED]
  src/App.tsx → src/views/BackupVaultPage.tsx
- `App()` --calls--> `MonthlyNotepadView()`  [EXTRACTED]
  src/App.tsx → src/views/MonthlyNotepadView.tsx
- `CoupleStudioModalProps` --references--> `CoupleProfile`  [EXTRACTED]
  src/components/CoupleStudioModal.tsx → src/types.ts
- `CoupleStudioModal()` --calls--> `formatStandardDate()`  [EXTRACTED]
  src/components/CoupleStudioModal.tsx → src/utils/dateFormat.ts

## Import Cycles
- None detected.

## Communities (20 total, 14 thin omitted)

### Community 0 - "Firebase Cloud Sync"
Cohesion: 0.13
Nodes (40): firebase, react-router-dom, CoupleStudioModal(), CoupleStudioModalProps, CAPYBARA_SEAL_LOGO, COUPLE_AVATAR_URL, DEFAULT_COUPLE_PROFILE, INITIAL_DIGITAL_LOVE_LETTERS (+32 more)

### Community 1 - "Audio Engine & Playback"
Cohesion: 0.10
Nodes (32): @dnd-kit/sortable, react, react-dom, App(), CustomDropdown(), CustomDropdownProps, DropdownOption, ImageCropperModal() (+24 more)

### Community 2 - "IndexedDB Local Store"
Cohesion: 0.10
Nodes (9): idbDeleteBackup(), idbGet(), idbGetAllBackups(), idbSet(), LocalDatabase, openIndexedDB(), saveLightweightMirror(), ActiveTab (+1 more)

### Community 3 - "Android Platform & Build"
Cohesion: 0.05
Nodes (36): config, devDependencies, autoprefixer, postcss, tailwindcss, @types/react, @types/react-dom, typescript (+28 more)

### Community 5 - "Build & Tooling Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 6 - "Android Platform & Build"
Cohesion: 0.13
Nodes (15): dependencies, @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/ios, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+7 more)

## Knowledge Gaps
- **12 isolated node(s):** `@capacitor/android`, `@capacitor/core`, `@capacitor/ios`, `framer-motion`, `lucide-react` (+7 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 99 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Audio Engine & Playback` to `Firebase Cloud Sync`, `Android Platform & Build`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **What connects `@capacitor/android`, `@capacitor/core`, `@capacitor/ios` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Firebase Cloud Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.13031914893617022 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Android Platform & Build` to `Android Platform & Build`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Should `Audio Engine & Playback` be split into smaller, more focused modules?**
  _Cohesion score 0.0971322849213691 - nodes in this community are weakly interconnected._
- **Why does `FirebaseSyncManager` connect `Firebase Cloud Sync` to `Firebase Cloud Sync`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `IndexedDB Local Store` be split into smaller, more focused modules?**
  _Cohesion score 0.10336817653890824 - nodes in this community are weakly interconnected._