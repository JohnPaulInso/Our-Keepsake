# Graph Report - Our Keepsake  (2026-11-18)

## Corpus Check
- 86 files · ~175,433 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .xml 10, (none) 4, .bat 3)

## Summary
- 288 nodes · 679 edges · 23 communities (9 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.95)
- Token cost: 120 input · 80 output

## Community Hubs (Navigation)
- Module 0: react
- Module 1: capacitor.config.ts
- IndexedDB & Local Storage Cache
- Module 3: src_assets_meandzea
- Firebase Sync & Firestore Cloud
- Firebase Sync & Firestore Cloud
- Module 6: tsconfig.json
- Android Packaging & Build
- Module 8: ExampleInstrumentedTest.java
- Audio Engine & Voice Notes
- Image Cropper & Polaroids
- Module 11: GitHub Actions Deployment
- Module 13: MainActivity.java

## God Nodes (most connected - your core abstractions)
1. `LocalDatabase` - 34 edges
2. `CoupleProfile` - 23 edges
3. `KeepsakeMemory` - 22 edges
4. `App()` - 21 edges
5. `FirebaseSyncManager` - 19 edges
6. `formatStandardDate()` - 17 edges
7. `compilerOptions` - 16 edges
8. `react` - 15 edges
9. `idbSet()` - 15 edges
10. `DigitalLoveLetter` - 15 edges

## Surprising Connections (you probably didn't know these)
- `GitHub Actions Deployment` --builds_and_deploys--> `JP App Blueprint`  [INFERRED]
  .github/workflows/deploy.yml → SKILL.md
- `CoupleStudioModalProps` --references--> `CoupleProfile`  [EXTRACTED]
  src/components/CoupleStudioModal.tsx → src/types.ts
- `Our Keepsake PRD` --specifies_style--> `Warm Linen Design Language`  [EXTRACTED]
  our_keepsake_project_prd_brief.md → stitch_our_love_story_journal/warm_linen_capybara_keepsake/DESIGN.md
- `App()` --calls--> `CoupleStudioModal()`  [EXTRACTED]
  src/App.tsx → src/components/CoupleStudioModal.tsx
- `App()` --calls--> `BackupVaultPage()`  [EXTRACTED]
  src/App.tsx → src/views/BackupVaultPage.tsx

## Import Cycles
- None detected.

## Communities (23 total, 14 thin omitted)

### Community 0 - "Module 0: react"
Cohesion: 0.12
Nodes (37): react, react-dom, react-router-dom, App(), CustomDropdown(), CustomDropdownProps, DropdownOption, PinLockModal() (+29 more)

### Community 1 - "Module 1: capacitor.config.ts"
Cohesion: 0.05
Nodes (38): config, devDependencies, autoprefixer, postcss, tailwindcss, @types/react, @types/react-dom, typescript (+30 more)

### Community 2 - "IndexedDB & Local Storage Cache"
Cohesion: 0.12
Nodes (9): idbDeleteBackup(), idbGet(), idbGetAllBackups(), idbSet(), LocalDatabase, openIndexedDB(), saveLightweightMirror(), ActiveTab (+1 more)

### Community 3 - "Module 3: src_assets_meandzea"
Cohesion: 0.15
Nodes (22): CoupleStudioModal(), CoupleStudioModalProps, PinLockModalProps, CAPYBARA_SEAL_LOGO, COUPLE_AVATAR_URL, DEFAULT_COUPLE_PROFILE, INITIAL_DIGITAL_LOVE_LETTERS, INITIAL_MEMORIES (+14 more)

### Community 4 - "Firebase Sync & Firestore Cloud"
Cohesion: 0.15
Nodes (21): MemCacheShape, AudioMemo, CoupleProfile, DigitalLoveLetter, DotIndicator, KeepsakeMemory, PartnerReplyNote, SecretYearNote (+13 more)

### Community 6 - "Module 6: tsconfig.json"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+9 more)

### Community 7 - "Android Packaging & Build"
Cohesion: 0.13
Nodes (15): dependencies, @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/ios, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+7 more)

### Community 10 - "Image Cropper & Polaroids"
Cohesion: 0.47
Nodes (3): ImageCropperModal(), ImageCropperModalProps, uploadOptimizedImage()

### Community 11 - "Module 11: GitHub Actions Deployment"
Cohesion: 0.50
Nodes (4): GitHub Actions Deployment, JP App Blueprint, Our Keepsake PRD, Warm Linen Design Language

## Knowledge Gaps
- **14 isolated node(s):** `@capacitor/android`, `@capacitor/core`, `@capacitor/ios`, `framer-motion`, `lucide-react` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 103 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Module 0: react` to `Module 1: capacitor.config.ts`, `Image Cropper & Polaroids`, `Module 3: src_assets_meandzea`, `Firebase Sync & Firestore Cloud`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **What connects `@capacitor/android`, `@capacitor/core`, `@capacitor/ios` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Module 0: react` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Android Packaging & Build` to `Module 1: capacitor.config.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `Module 1: capacitor.config.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Why does `FirebaseSyncManager` connect `Firebase Sync & Firestore Cloud` to `Module 3: src_assets_meandzea`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `IndexedDB & Local Storage Cache` be split into smaller, more focused modules?**
  _Cohesion score 0.12233285917496443 - nodes in this community are weakly interconnected._