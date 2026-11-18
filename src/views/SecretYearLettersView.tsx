// (2026-07-13) Import createPortal for full overlay; was trapped in main
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CoupleProfile, DigitalLoveLetter, SecretYearNote } from '../types';
import { formatStandardDate } from '../utils/dateFormat';
import { CustomDropdown } from '../components/CustomDropdown';

interface SecretYearLettersViewProps {
  profile: CoupleProfile;
  secretNotes: SecretYearNote[];
  digitalLoveLetters: DigitalLoveLetter[];
  onSaveSecretNote: (note: SecretYearNote) => void;
  onDeleteSecretNote: (id: string) => void;
  onToggleFavoriteNote: (id: string) => void;
  onSaveDigitalLetter: (letter: DigitalLoveLetter) => void;
  onDeleteDigitalLetter: (id: string) => void;
  onToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
}

const CATEGORY_LABELS: Record<SecretYearNote['category'], string> = {
  LITTLE_HABIT: 'Her Little Habits',
  FUNNY_MOMENT: 'Funny Moments',
  QUIET_LOVE: 'Quiet Love',
  MILESTONE: 'Milestones',
  FAVORITE_THING: 'Her Favorites',
};

const PAPER_STATUS_LABELS: Record<DigitalLoveLetter['paperStatus'], string> = {
  TRANSCRIBED_TO_PAPER: 'Written on Paper Afterward',
  WAX_SEALED_GIVEN: 'Handwritten & Wax-Sealed',
  DIGITAL_ORIGINAL: 'Digital Original Draft',
};

export const SecretYearLettersView: React.FC<SecretYearLettersViewProps> = ({
  profile,
  secretNotes,
  digitalLoveLetters,
  onSaveSecretNote,
  onDeleteSecretNote,
  onToggleFavoriteNote,
  onSaveDigitalLetter,
  onDeleteDigitalLetter,
  onToast,
}) => {
  const [activeMode, setActiveMode] = useState<'DIGITAL_LETTERS' | 'SECRET_YEAR_NOTES'>(
    'DIGITAL_LETTERS'
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | SecretYearNote['category']>('ALL');
  const [surpriseRevealMode, setSurpriseRevealMode] = useState(false);

  // Secret Note Modal States
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SecretYearNote | null>(null);
  const [deleteNoteTargetId, setDeleteNoteTargetId] = useState<string | null>(null);

  const [monthLabel, setMonthLabel] = useState('Month 12 • Secret Log');
  const [dateISO, setDateISO] = useState('2026-11-16');
  const [title, setTitle] = useState('');
  const [littleThingsNoted, setLittleThingsNoted] = useState('');
  const [whatSheSaid, setWhatSheSaid] = useState('');
  const [secretThought, setSecretThought] = useState('');
  const [category, setCategory] = useState<SecretYearNote['category']>('LITTLE_HABIT');

  // Digital Love Letter Modal States
  const [letterComposerOpen, setLetterComposerOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<DigitalLoveLetter | null>(null);
  const [readingLetter, setReadingLetter] = useState<DigitalLoveLetter | null>(null);
  const [deleteLetterTargetId, setDeleteLetterTargetId] = useState<string | null>(null);

  const [letterTitle, setLetterTitle] = useState('');
  const [letterOccasion, setLetterOccasion] = useState('Handwritten Letter Draft');
  const [letterDateISO, setLetterDateISO] = useState('2026-11-16');
  const [letterPaperStatus, setLetterPaperStatus] =
    useState<DigitalLoveLetter['paperStatus']>('TRANSCRIBED_TO_PAPER');
  const [letterSalutation, setLetterSalutation] = useState(`My dearest ${profile.partner2Name},`);
  const [letterBody, setLetterBody] = useState('');
  const [letterSignOff, setLetterSignOff] = useState(`All my love, always,\n${profile.partner1Name}`);
  const [letterPaperNotes, setLetterPaperNotes] = useState(
    'Drafted digitally first, then handwritten onto cream cotton paper.'
  );

  useEffect(() => {
    const anyModal =
      noteComposerOpen ||
      Boolean(deleteNoteTargetId) ||
      letterComposerOpen ||
      Boolean(readingLetter) ||
      Boolean(deleteLetterTargetId);
    if (anyModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [
    noteComposerOpen,
    deleteNoteTargetId,
    letterComposerOpen,
    readingLetter,
    deleteLetterTargetId,
  ]);

  const openNewLetterModal = () => {
    setEditingLetter(null);
    setLetterTitle('');
    setLetterOccasion('Drafted Before Writing on Paper');
    setLetterDateISO(new Date().toISOString().slice(0, 10));
    setLetterPaperStatus('TRANSCRIBED_TO_PAPER');
    setLetterSalutation(`My dearest ${profile.partner2Name},`);
    setLetterBody('');
    setLetterSignOff(`Forever yours,\n${profile.partner1Name}`);
    setLetterPaperNotes('Digital draft written before transcribing by hand onto stationery paper.');
    setLetterComposerOpen(true);
  };

  const openEditLetterModal = (letter: DigitalLoveLetter) => {
    setEditingLetter(letter);
    setLetterTitle(letter.title);
    setLetterOccasion(letter.occasion);
    setLetterDateISO(letter.dateISO);
    setLetterPaperStatus(letter.paperStatus);
    setLetterSalutation(letter.salutation);
    setLetterBody(letter.body);
    setLetterSignOff(letter.signOff);
    setLetterPaperNotes(letter.paperNotes || '');
    setLetterComposerOpen(true);
  };

  const handleSaveLetterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterBody.trim() && !letterTitle.trim()) return;
    const payload: DigitalLoveLetter = {
      id: editingLetter?.id || `dll-${Date.now()}`,
      letterNumber: editingLetter?.letterNumber || digitalLoveLetters.length + 1,
      title: letterTitle.trim() || `Love Letter #${digitalLoveLetters.length + 1} for ${profile.partner2Name}`,
      occasion: letterOccasion.trim() || 'Handwritten Stationery Draft',
      dateISO: letterDateISO,
      paperStatus: letterPaperStatus,
      salutation: letterSalutation.trim() || `My dearest ${profile.partner2Name},`,
      body:
        letterBody.trim() ||
        `I wrote this digital copy first before writing every word onto physical paper for you, ${profile.partner2Name}.`,
      signOff: letterSignOff.trim() || `Forever yours,\n${profile.partner1Name}`,
      paperNotes: letterPaperNotes.trim(),
      isFavorite: editingLetter?.isFavorite ?? true,
      updatedAt: Date.now(),
    };
    // (2026-07-13) Update active letter reader state on save; was stale reader
    onSaveDigitalLetter(payload);
    if (readingLetter?.id === payload.id) {
      setReadingLetter(payload);
    }
    setLetterComposerOpen(false);
    onToast(`Digital love letter saved to ${profile.partner2Name}'s archive!`, 'success');
  };

  const openNewNoteModal = () => {
    setEditingNote(null);
    setMonthLabel(`Secret Note #${secretNotes.length + 1}`);
    setDateISO(new Date().toISOString().slice(0, 10));
    setTitle('');
    setLittleThingsNoted('');
    setWhatSheSaid('');
    setSecretThought('');
    setCategory('LITTLE_HABIT');
    setNoteComposerOpen(true);
  };

  const openEditNoteModal = (note: SecretYearNote) => {
    setEditingNote(note);
    setMonthLabel(note.monthLabel);
    setDateISO(note.dateISO);
    setTitle(note.title);
    setLittleThingsNoted(note.littleThingsNoted);
    setWhatSheSaid(note.whatSheSaid);
    setSecretThought(note.secretThought);
    setCategory(note.category);
    setNoteComposerOpen(true);
  };

  const handleSaveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !littleThingsNoted.trim()) return;
    const payload: SecretYearNote = {
      id: editingNote?.id || `syn-${Date.now()}`,
      monthLabel: monthLabel.trim() || 'Past Year Log',
      dateISO,
      title: title.trim() || `Little Note About ${profile.partner2Name}`,
      littleThingsNoted:
        littleThingsNoted.trim() ||
        `Another sweet moment with ${profile.partner2Name} that I wanted to keep forever.`,
      whatSheSaid: whatSheSaid.trim() || '“Wait, tell me that again!”',
      secretThought:
        secretThought.trim() ||
        `I love how effortless every day feels with you, ${profile.partner2Name}.`,
      category,
      isFavorite: editingNote?.isFavorite ?? true,
      updatedAt: Date.now(),
    };
    onSaveSecretNote(payload);
    setNoteComposerOpen(false);
    onToast(`Secret year note saved for ${profile.partner2Name}!`, 'success');
  };

  const filteredLetters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return digitalLoveLetters;
    return digitalLoveLetters.filter((l) => {
      const hay = `${l.title} ${l.occasion} ${l.salutation} ${l.body} ${l.signOff} ${l.paperNotes || ''} ${formatStandardDate(l.dateISO)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [digitalLoveLetters, search]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return secretNotes.filter((n) => {
      if (categoryFilter !== 'ALL' && n.category !== categoryFilter) return false;
      if (!q) return true;
      const hay = `${n.monthLabel} ${n.title} ${n.littleThingsNoted} ${n.whatSheSaid} ${n.secretThought} ${formatStandardDate(n.dateISO)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [secretNotes, search, categoryFilter]);

  return (
    <div className="flex flex-col w-full px-margin pb-space-xl max-w-[760px] mx-auto">
      {/* Romantic Editorial Reveal Banner */}
      <section className="flex flex-col items-center text-center mt-space-sm mb-space-lg relative bg-surface-container-lowest rounded-2xl p-space-lg shadow-md border border-outline-variant/35 overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container mb-space-sm shadow-xs">
          <span
            className="material-symbols-outlined text-[15px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mail
          </span>
          <span className="font-label-md text-label-md uppercase tracking-widest">
            Letters &amp; Secret Year Vault • {profile.partner1Name} to {profile.partner2Name}
          </span>
        </div>

        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-serif mb-2">
          {activeMode === 'DIGITAL_LETTERS'
            ? `Digital Copies of Every Love Letter I Wrote on Paper for ${profile.partner2Name}`
            : `Everything I Secretly Noted About You This Past Year, ${profile.partner2Name}`}
        </h1>
        <p className="font-italic-quote text-body-md text-on-surface-variant italic font-serif max-w-md leading-relaxed">
          {activeMode === 'DIGITAL_LETTERS'
            ? `“Before I ever wrote our love letters onto physical paper, I typed every word right here so we would always have the original digital manuscripts forever.”`
            : `“You did not know this, ${profile.partner2Name}, but for the past year I kept a secret note of every little thing that happened—how you laughed, what you said, and all the quiet moments.”`}
        </p>

        {/* Segmented Mode Switcher: Digital Love Letters vs Past-Year Secret Notes */}
        <div
          id="letters-mode-switcher" // Switch between love letters & year notes
          className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-container-low border border-outline-variant/40 w-full max-w-md mt-4"
        >
          <button
            type="button"
            onClick={() => setActiveMode('DIGITAL_LETTERS')}
            className={`py-2 px-3 rounded-lg font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'DIGITAL_LETTERS'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history_edu</span>
            <span>Love Letters ({digitalLoveLetters.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('SECRET_YEAR_NOTES')}
            className={`py-2 px-3 rounded-lg font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'SECRET_YEAR_NOTES'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>Past-Year Notes ({secretNotes.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
          {activeMode === 'DIGITAL_LETTERS' ? (
            <button
              type="button"
              onClick={openNewLetterModal}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[17px]">post_add</span>
              <span>Add / Paste Digital Love Letter</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewNoteModal}
              className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[17px]">add_circle</span>
              <span>Add Secret Year Note</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSurpriseRevealMode((p) => !p);
              onToast(
                !surpriseRevealMode
                  ? `Surprise Reveal Mode for ${profile.partner2Name} activated!`
                  : 'Editor controls restored.',
                'info'
              );
            }}
            className="px-4 py-2.5 rounded-xl bg-surface-container-low text-primary font-label-md text-label-md uppercase tracking-wider flex items-center gap-1.5 border border-outline-variant/40"
          >
            <span className="material-symbols-outlined text-[17px] text-secondary">redeem</span>
            <span>
              {surpriseRevealMode ? 'Exit Gift Mode' : `Gift View for ${profile.partner2Name}`}
            </span>
          </button>
        </div>
      </section>

      {/* Search Bar */}
      <section className="bg-surface-container-lowest rounded-xl p-space-md mb-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-3">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined text-[19px] text-secondary absolute left-3.5 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeMode === 'DIGITAL_LETTERS'
                ? `Search digital copies of love letters written for ${profile.partner2Name}...`
                : `Search ${profile.partner1Name}'s secret notes from the past year...`
            }
            className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 text-secondary hover:text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {activeMode === 'SECRET_YEAR_NOTES' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All Secret Notes' },
              { id: 'LITTLE_HABIT', label: 'Her Little Habits' },
              { id: 'FUNNY_MOMENT', label: 'Funny Moments' },
              { id: 'QUIET_LOVE', label: 'Quiet Love' },
              { id: 'FAVORITE_THING', label: 'Her Favorites' },
              { id: 'MILESTONE', label: 'Milestones' },
            ].map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setCategoryFilter(tab.id as 'ALL' | SecretYearNote['category'])
                  }
                  className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* VIEW 1: DIGITAL COPIES OF LOVE LETTERS (WRITTEN BEFORE PAPER) */}
      {/* (2026-07-13) Clean slate empty card for letters vs empty white space */}
      {activeMode === 'DIGITAL_LETTERS' && (
        <div className="flex flex-col gap-space-lg">
          {filteredLetters.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 text-center shadow-sm border border-outline-variant/35 flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-secondary">
                history_edu
              </span>
              <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                No Digital Love Letters Yet
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                A clean slate is ready for you. Tap &ldquo;Add / Paste Digital Love Letter&rdquo; above to record the digital drafts of your love letters for {profile.partner2Name}.
              </p>
            </div>
          ) : (
            filteredLetters.map((letter) => (
            <article
              key={letter.id}
              className="relative bg-surface-container-lowest rounded-2xl p-space-lg shadow-md border border-outline-variant/35 overflow-hidden hover-lift"
            >
              {/* Top Washi Tape & Paper Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-outline-variant/25">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary calendar-num-font text-[11px] font-bold flex items-center justify-center shadow-xs">
                    #{letter.letterNumber}
                  </div>
                  <span className="font-label-md text-label-md uppercase tracking-widest text-secondary">
                    {letter.occasion}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/70 text-on-secondary-container font-label-md text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">ink_pen</span>
                    <span>{PAPER_STATUS_LABELS[letter.paperStatus]}</span>
                  </span>
                  <span className="calendar-num-font text-[12px] font-medium text-on-surface-variant">
                    {formatStandardDate(letter.dateISO)}
                  </span>
                </div>
              </div>

              {/* Letter Title */}
              <h2
                onClick={() => setReadingLetter(letter)}
                className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-serif mb-3 cursor-pointer hover:text-secondary transition-colors"
              >
                {letter.title}
              </h2>

              {/* Parchment Letter Content Box */}
              <div
                onClick={() => setReadingLetter(letter)}
                className="bg-surface-container-low/65 rounded-xl p-4 sm:p-5 border border-outline-variant/25 cursor-pointer mb-3"
              >
                <p className="font-headline-sm text-body-lg text-primary italic font-serif mb-2.5">
                  {letter.salutation}
                </p>
                {/* (2026-07-13) Clamp letter body preview to 4 lines; was unclamped */}
                <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-line font-serif line-clamp-4">
                  {letter.body}
                </p>
                <div className="mt-3 pt-2 flex items-center justify-between text-secondary border-t border-outline-variant/20">
                  <span className="text-xs italic font-sans hover:text-primary transition-colors flex items-center gap-1">
                    <span>Read full letter</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                  <p className="font-headline-sm text-body-md text-secondary italic font-serif">
                    {letter.signOff}
                  </p>
                </div>
              </div>

              {/* Physical Paper Transcription Note */}
              {letter.paperNotes && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low text-secondary font-body-sm text-body-sm mb-2">
                  <span className="material-symbols-outlined text-[16px] shrink-0">
                    description
                  </span>
                  <span className="italic">
                    <strong>Paper Stationery Note:</strong> {letter.paperNotes}
                  </span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setReadingLetter(letter)}
                  className="font-label-md text-label-md uppercase tracking-wider text-primary font-semibold flex items-center gap-1 hover:text-secondary"
                >
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>Open Full Stationery View</span>
                </button>

                {!surpriseRevealMode && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          `${letter.salutation}\n\n${letter.body}\n\n${letter.signOff}`
                        );
                        onToast('Digital love letter copied to clipboard!', 'info');
                      }}
                      className="font-label-md text-label-md text-secondary hover:text-primary flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">content_copy</span>
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditLetterModal(letter)}
                      className="font-label-md text-label-md text-secondary hover:text-primary flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteLetterTargetId(letter.id)}
                      className="font-label-md text-label-md text-error flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                )}
              </div>
            </article>
          )))}
        </div>
      )}

      {/* VIEW 2: SECRET PAST-YEAR NOTES FOR ZEA */}
      {/* (2026-07-13) Clean slate empty card for notes vs empty white space */}
      {activeMode === 'SECRET_YEAR_NOTES' && (
        <div className="flex flex-col gap-space-md">
          {filteredNotes.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-8 text-center shadow-sm border border-outline-variant/35 flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-secondary">
                auto_awesome
              </span>
              <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                No Secret Year Notes Yet
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                Tap &ldquo;Add Secret Year Note&rdquo; above to record private memories, thoughts, and little things you noticed about {profile.partner2Name}.
              </p>
            </div>
          ) : (
            filteredNotes.map((note, idx) => (
            <article
              key={note.id}
              className="relative bg-surface-container-lowest rounded-xl p-space-md shadow-md border border-outline-variant/30 overflow-hidden hover-lift"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container calendar-num-font text-[11px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-label-md text-label-md uppercase tracking-wider text-secondary truncate-single">
                    {note.monthLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-secondary font-label-md text-[10px] uppercase">
                    {CATEGORY_LABELS[note.category]}
                  </span>
                  <span className="calendar-num-font text-[12px] text-on-surface-variant">
                    {formatStandardDate(note.dateISO)}
                  </span>
                </div>
              </div>

              <h2 className="font-headline-sm text-headline-sm text-primary font-serif mb-2">
                {note.title}
              </h2>

              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-3">
                {note.littleThingsNoted}
              </p>

              {note.whatSheSaid && (
                <div className="bg-surface-container-low/80 rounded-lg p-3 mb-3 border-l-2 border-secondary">
                  <span className="font-label-md text-[10px] uppercase tracking-widest text-secondary block mb-0.5">
                    What {profile.partner2Name} Said:
                  </span>
                  <p className="font-italic-quote text-body-md text-primary italic font-serif">
                    {note.whatSheSaid}
                  </p>
                </div>
              )}

              <div className="bg-secondary-container/30 rounded-lg p-3 flex items-start gap-2">
                <span
                  className="material-symbols-outlined text-[17px] text-secondary shrink-0 mt-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
                <p className="font-body-sm text-body-sm text-primary italic font-serif">
                  <strong>{profile.partner1Name}&apos;s Secret Thought:</strong>{' '}
                  {note.secretThought}
                </p>
              </div>

              {!surpriseRevealMode && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => onToggleFavoriteNote(note.id)}
                    className="flex items-center gap-1 text-secondary hover:text-primary font-label-md text-label-md"
                  >
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{
                        fontVariationSettings: note.isFavorite ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {note.isFavorite ? 'favorite' : 'favorite_border'}
                    </span>
                    <span>{note.isFavorite ? 'Cherished' : 'Mark Favorite'}</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditNoteModal(note)}
                      className="font-label-md text-label-md text-secondary hover:text-primary flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteNoteTargetId(note.id)}
                      className="font-label-md text-label-md text-error flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              )}
            </article>
          )))}
        </div>
      )}

      {/* (2026-07-13) Portal letter reader to document body; was trapped in main z-10 */}
      {readingLetter && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-text no-print"
          onClick={() => setReadingLetter(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-outline-variant/50 modal-animate-in flex flex-col gap-4 relative"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div>
                <span className="font-label-md text-label-md uppercase tracking-widest text-secondary block">
                  Love Letter #{readingLetter.letterNumber} • {formatStandardDate(readingLetter.dateISO)}
                </span>
                {readingLetter.occasion && (
                  <span className="text-[11px] text-outline uppercase font-medium">
                    {readingLetter.occasion}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReadingLetter(null)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <h3 className="font-['Playfair_Display',Georgia,serif] text-2xl sm:text-3xl text-primary font-bold">
              {readingLetter.title}
            </h3>

            <div className="bg-[#fdfbf7] rounded-2xl p-6 sm:p-8 border border-[#dfcbb7]/60 shadow-xs">
              {readingLetter.salutation && (
                <p className="font-['Playfair_Display',Georgia,serif] text-xl sm:text-2xl text-primary font-semibold italic mb-4">
                  {readingLetter.salutation}
                </p>
              )}
              <div className="font-['Cormorant_Garamond',Georgia,serif] text-lg sm:text-xl text-[#3b2d24] whitespace-pre-line leading-[2.1rem] select-text">
                {readingLetter.body}
              </div>
              <div className="mt-8 flex flex-col items-end text-right">
                <p className="font-['Playfair_Display',Georgia,serif] text-lg text-primary font-medium italic whitespace-pre-line">
                  {readingLetter.signOff}
                </p>
              </div>
            </div>

            {readingLetter.paperNotes && (
              <p className="font-body-sm text-body-sm text-secondary italic text-center">
                {readingLetter.paperNotes}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* (2026-07-13) Add safe insets to overlay top/bottom navbars; was flush edges */}
      {letterComposerOpen && typeof document !== 'undefined' && createPortal(
        <div
          id="love-letter-composer-overlay"
          className="fixed inset-0 z-[120] bg-[#fbf8f4] text-primary w-full h-full min-h-screen flex flex-col select-text no-print"
        >
          {/* Top navigation bar */}
          <div
            className="sticky top-0 z-20 bg-[#fbf8f4]/95 backdrop-blur-md border-b border-outline-variant/30 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0"
            style={{
              paddingTop: 'max(20px, env(safe-area-inset-top, 20px))',
              paddingBottom: '14px',
            }}
          >
            {/* (2026-07-13) Clean title and single close button; was dual back & close */}
            <div>
              <h2 className="font-['Playfair_Display',Georgia,serif] text-lg sm:text-xl font-bold text-primary leading-tight">
                {editingLetter ? 'Edit Love Letter' : `Write Love Letter for ${profile.partner2Name}`}
              </h2>
              <span className="text-xs text-secondary italic">A digital keepsake copy of your heartfelt words</span>
            </div>
            <button
              type="button"
              onClick={() => setLetterComposerOpen(false)}
              className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-primary transition-colors active:scale-95"
              aria-label="Close composer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form
            onSubmit={handleSaveLetterSubmit}
            className="flex-1 overflow-y-auto flex flex-col w-full"
          >
            <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 flex-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                  Letter Title
                </label>
                <input
                  type="text"
                  value={letterTitle}
                  onChange={(e) => setLetterTitle(e.target.value)}
                  placeholder="E.g., Penelope or To My Favorite Person..."
                  required
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-primary font-serif text-base sm:text-lg border border-outline-variant/40 focus:border-primary/60 outline-none transition-colors shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                    Date
                  </label>
                  <input
                    type="date"
                    value={letterDateISO}
                    onChange={(e) => setLetterDateISO(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-primary text-sm border border-outline-variant/40 focus:border-primary/60 outline-none shadow-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                    Occasion / Tag
                  </label>
                  <input
                    type="text"
                    value={letterOccasion}
                    onChange={(e) => setLetterOccasion(e.target.value)}
                    placeholder="E.g., Apology & Love"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-primary text-sm border border-outline-variant/40 focus:border-primary/60 outline-none shadow-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                  Your Letter
                </label>
                <textarea
                  rows={12}
                  value={letterBody}
                  onChange={(e) => setLetterBody(e.target.value)}
                  placeholder={`Write or paste your letter for ${profile.partner2Name} here...`}
                  required
                  className="w-full p-4 rounded-xl bg-[#fdfbf7] text-[#3b2d24] font-['Cormorant_Garamond',Georgia,serif] text-base sm:text-lg leading-relaxed border border-outline-variant/40 focus:border-primary/60 outline-none min-h-[260px] resize-y shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                  Sign-off
                </label>
                <input
                  type="text"
                  value={letterSignOff}
                  onChange={(e) => setLetterSignOff(e.target.value)}
                  placeholder="E.g., -JP or Forever yours, JP"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low text-primary text-sm border border-outline-variant/40 focus:border-primary/60 outline-none shadow-xs"
                />
              </div>
            </div>

            {/* Bottom navigation bar */}
            <div
              className="sticky bottom-0 z-20 bg-[#fbf8f4]/95 backdrop-blur-md border-t border-outline-variant/25 px-4 sm:px-6 flex items-center justify-end gap-3 shadow-[0_-4px_16px_rgba(74,59,50,0.06)] shrink-0"
              style={{
                paddingTop: '12px',
                paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
              }}
            >
              <button
                type="button"
                onClick={() => setLetterComposerOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-surface-container-low text-secondary text-xs uppercase font-semibold hover:bg-surface-container transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs uppercase tracking-wider font-semibold shadow-md hover:bg-primary/95 transition-all active:scale-95"
              >
                Save Love Letter
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Add / Edit Secret Year Note Modal */}
      {noteComposerOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setNoteComposerOpen(false)}
        >
          <form
            onSubmit={handleSaveNoteSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
              <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
                {editingNote
                  ? `Edit Secret Note for ${profile.partner2Name}`
                  : `Record a Secret Past-Year Note for ${profile.partner2Name}`}
              </h3>
              <button
                type="button"
                onClick={() => setNoteComposerOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-label-md text-label-md uppercase text-outline block mb-1">
                  Month / Chapter Label
                </label>
                <input
                  type="text"
                  value={monthLabel}
                  onChange={(e) => setMonthLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
                />
              </div>
              <div>
                <label className="font-label-md text-label-md uppercase text-outline block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
                />
              </div>
            </div>

            <CustomDropdown
              label="Note Category"
              options={[
                { value: 'LITTLE_HABIT', label: 'Her Little Habits', icon: 'auto_awesome' },
                { value: 'FUNNY_MOMENT', label: 'Funny Moments', icon: 'sentiment_very_satisfied' },
                { value: 'QUIET_LOVE', label: 'Quiet Love', icon: 'favorite' },
                { value: 'FAVORITE_THING', label: 'Her Favorites', icon: 'redeem' },
                { value: 'MILESTONE', label: 'Milestones', icon: 'stars' },
              ]}
              value={category}
              onChange={(val) => setCategory(val as SecretYearNote['category'])}
            />

            <div>
              <label className="font-label-md text-label-md uppercase text-outline block mb-1">
                Title of What Happened
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`E.g., The way ${profile.partner2Name} always orders extra matcha...`}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
              />
            </div>

            <div>
              <label className="font-label-md text-label-md uppercase text-outline block mb-1">
                Everything I Noticed in That Moment
              </label>
              <textarea
                rows={3}
                value={littleThingsNoted}
                onChange={(e) => setLittleThingsNoted(e.target.value)}
                placeholder="Write down the exact details she did not realize you remembered..."
                className="w-full p-3 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
              />
            </div>

            <div>
              <label className="font-label-md text-label-md uppercase text-outline block mb-1">
                What {profile.partner2Name} Said
              </label>
              <input
                type="text"
                value={whatSheSaid}
                onChange={(e) => setWhatSheSaid(e.target.value)}
                placeholder="Her exact quote..."
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
              />
            </div>

            <div>
              <label className="font-label-md text-label-md uppercase text-outline block mb-1">
                My Secret Thought for Her
              </label>
              <textarea
                rows={2}
                value={secretThought}
                onChange={(e) => setSecretThought(e.target.value)}
                placeholder="Why this moment meant the world to you..."
                className="w-full p-3 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm border border-outline-variant/40"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoteComposerOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-low text-secondary font-label-md text-label-md uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase shadow-md"
              >
                Seal Secret Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Digital Letter Confirmation Modal */}
      {deleteLetterTargetId && (
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteLetterTargetId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-4 text-center"
          >
            <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
              Remove Digital Love Letter?
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              This will remove this digital love letter draft from your archive.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteLetterTargetId(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-secondary font-label-md text-label-md uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDigitalLetter(deleteLetterTargetId);
                  setDeleteLetterTargetId(null);
                  onToast('Digital love letter removed.', 'info');
                }}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Secret Note Confirmation Modal */}
      {deleteNoteTargetId && (
        <div
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteNoteTargetId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-4 text-center"
          >
            <h3 className="font-headline-sm text-headline-sm text-primary font-serif">
              Remove Secret Note?
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              This will remove the note from your past-year ledger.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteNoteTargetId(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-secondary font-label-md text-label-md uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSecretNote(deleteNoteTargetId);
                  setDeleteNoteTargetId(null);
                  onToast('Secret note removed.', 'info');
                }}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
