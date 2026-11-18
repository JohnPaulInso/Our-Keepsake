// (2026-07-13) Date-smart photo gallery picker with multi-select vs single file
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PolaroidPhoto, KeepsakeMemory } from '../types';
import { formatStandardDate } from '../utils/dateFormat';
import { pushModal } from '../utils/modalManager';
import { idbGet, idbSet } from '../db/localDb';

export interface GalleryPhotoItem extends PolaroidPhoto {
  dateISO: string;
  sourceMemoryTitle?: string;
}

interface DateGalleryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDateISO: string;
  allMemories: KeepsakeMemory[];
  onSelectPhotos: (selected: PolaroidPhoto[]) => void;
  onToast?: (msg: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function shiftDateByDays(iso: string, days: number): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const yStr = dt.getFullYear();
    const mStr = String(dt.getMonth() + 1).padStart(2, '0');
    const dStr = String(dt.getDate()).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  } catch {
    return iso;
  }
}

export const DateGalleryPickerModal: React.FC<DateGalleryPickerModalProps> = ({
  isOpen,
  onClose,
  targetDateISO,
  allMemories,
  onSelectPhotos,
  onToast,
}) => {
  const [dayOffset, setDayOffset] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<'WINDOW' | 'MONTH' | 'ALL'>('WINDOW');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stagedPhotos, setStagedPhotos] = useState<GalleryPhotoItem[]>([]);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Register with modal manager for universal back dismissal
  useEffect(() => {
    if (isOpen) {
      return pushModal('date-gallery-picker', onClose);
    }
  }, [isOpen, onClose]);

  // Load staged photos from IndexedDB on open
  useEffect(() => {
    if (!isOpen) return;
    idbGet<GalleryPhotoItem[]>('staged_gallery_photos')
      .then((saved) => {
        if (saved && Array.isArray(saved)) {
          setStagedPhotos(saved);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Reset offset and selected set when targetDate changes
  useEffect(() => {
    setDayOffset(0);
    setFilterMode('WINDOW');
    setSelectedIds(new Set());
  }, [targetDateISO]);

  // Compute 3-day window around (targetDate + offset)
  const windowDates = useMemo(() => {
    const centerDateISO = shiftDateByDays(targetDateISO, dayOffset);
    const prevDateISO = shiftDateByDays(centerDateISO, -1);
    const nextDateISO = shiftDateByDays(centerDateISO, 1);
    return {
      prev: prevDateISO,
      center: centerDateISO,
      next: nextDateISO,
      allThree: [prevDateISO, centerDateISO, nextDateISO],
      label: `${formatStandardDate(prevDateISO).replace(/, \d{4}$/, '')} – ${formatStandardDate(nextDateISO)}`,
    };
  }, [targetDateISO, dayOffset]);

  // Combine memory photos and staged photos into a single pool
  const allPoolPhotos = useMemo(() => {
    const pool: GalleryPhotoItem[] = [];
    const seenUrls = new Set<string>();

    // Photos from existing memories
    allMemories.forEach((m) => {
      (m.photos || []).forEach((p) => {
        if (p.url && !seenUrls.has(p.url)) {
          seenUrls.add(p.url);
          pool.push({
            ...p,
            dateISO: m.dateISO,
            sourceMemoryTitle: m.title,
          });
        }
      });
    });

    // Staged photos
    stagedPhotos.forEach((sp) => {
      if (sp.url && !seenUrls.has(sp.url)) {
        seenUrls.add(sp.url);
        pool.push(sp);
      }
    });

    return pool;
  }, [allMemories, stagedPhotos]);

  // Filter photos based on active mode
  const filteredPhotos = useMemo(() => {
    if (filterMode === 'ALL') {
      return [...allPoolPhotos].sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));
    }

    if (filterMode === 'MONTH') {
      const monthPrefix = targetDateISO.slice(0, 7); // e.g. "2026-11"
      return allPoolPhotos
        .filter((p) => p.dateISO?.startsWith(monthPrefix))
        .sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));
    }

    // Default 3-day window
    const targetSet = new Set(windowDates.allThree);
    return allPoolPhotos
      .filter((p) => targetSet.has(p.dateISO))
      .sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));
  }, [allPoolPhotos, filterMode, windowDates, targetDateISO]);

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredPhotos.every((p) => next.has(p.id));
      if (allSelected) {
        filteredPhotos.forEach((p) => next.delete(p.id));
      } else {
        filteredPhotos.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;

    setIsProcessingUpload(true);
    try {
      const newItems: GalleryPhotoItem[] = [];
      const now = Date.now();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedUrl = await compressImageFile(file);
        const item: GalleryPhotoItem = {
          id: `ph-${now}-${i}`,
          url: compressedUrl,
          caption: file.name.replace(/\.[^.]+$/, ''),
          tag: 'POLAROID',
          dateISO: targetDateISO,
        };
        newItems.push(item);
      }

      const updatedStaged = [...newItems, ...stagedPhotos];
      setStagedPhotos(updatedStaged);
      await idbSet('staged_gallery_photos', updatedStaged);

      // Auto-select newly uploaded items
      setSelectedIds((prev) => {
        const next = new Set(prev);
        newItems.forEach((it) => next.add(it.id));
        return next;
      });

      onToast?.(`Imported ${newItems.length} photos into gallery for ${formatStandardDate(targetDateISO)}!`, 'success');
    } catch {
      onToast?.('Failed to process some images', 'danger');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleConfirmAttach = () => {
    const selectedList = allPoolPhotos.filter((p) => selectedIds.has(p.id));
    if (selectedList.length === 0) {
      onClose();
      return;
    }
    const polaroids: PolaroidPhoto[] = selectedList.map((p) => ({
      id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: p.url,
      caption: p.caption,
      tag: p.tag || 'POLAROID',
    }));
    onSelectPhotos(polaroids);
    onToast?.(`Attached ${polaroids.length} photo${polaroids.length > 1 ? 's' : ''} to keepsake!`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[160] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90dvh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/35 flex flex-col overflow-hidden modal-animate-in"
      >
        {/* Header Bar */}
        <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between bg-surface-bright/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-[22px]">photo_library</span>
            <div className="flex flex-col min-w-0">
              <h2 className="font-headline-sm text-[16px] text-primary font-serif leading-tight truncate-single">
                Date Gallery: {formatStandardDate(targetDateISO)}
              </h2>
              <span className="text-[11px] text-secondary font-medium truncate-single">
                {windowDates.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Gallery Picker"
            className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary hover:text-primary active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Date Window Navigation & Scope Pills */}
        <div className="px-4 py-2.5 bg-surface-container-low/60 border-b border-outline-variant/15 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-1.5">
            {/* Earlier / Later window controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDayOffset((prev) => prev - 3)}
                className="px-2.5 py-1 rounded-lg bg-surface-container text-secondary hover:text-primary text-[11px] font-semibold flex items-center gap-1 border border-outline-variant/20 active:scale-95"
                title="View earlier dates"
              >
                <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                <span>Earlier</span>
              </button>
              {dayOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setDayOffset(0)}
                  className="px-2 py-1 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-bold active:scale-95"
                >
                  Current Date
                </button>
              )}
              <button
                type="button"
                onClick={() => setDayOffset((prev) => prev + 3)}
                className="px-2.5 py-1 rounded-lg bg-surface-container text-secondary hover:text-primary text-[11px] font-semibold flex items-center gap-1 border border-outline-variant/20 active:scale-95"
                title="View later dates"
              >
                <span>Later</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>

            {/* Scope Filter Tabs */}
            <div className="flex items-center gap-1 bg-surface-container-high/60 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setFilterMode('WINDOW')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  filterMode === 'WINDOW'
                    ? 'bg-surface-bright text-primary font-bold shadow-2xs'
                    : 'text-secondary hover:text-primary font-medium'
                }`}
              >
                3-Day Window
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('MONTH')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  filterMode === 'MONTH'
                    ? 'bg-surface-bright text-primary font-bold shadow-2xs'
                    : 'text-secondary hover:text-primary font-medium'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  filterMode === 'ALL'
                    ? 'bg-surface-bright text-primary font-bold shadow-2xs'
                    : 'text-secondary hover:text-primary font-medium'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Photos Grid Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredPhotos.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[28px]">photo_library</span>
              </div>
              <div className="max-w-xs">
                <p className="font-headline-sm text-sm text-primary font-serif">
                  No images found for this date range
                </p>
                <p className="text-[12px] text-outline mt-1">
                  Upload multiple photos from your device to attach them directly to this memory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-[12px] font-semibold active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
                <span>Upload Photos from Phone</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredPhotos.map((photo) => {
                const isSelected = selectedIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelect(photo.id)}
                    className={`group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all aspect-square bg-surface-container ${
                      isSelected
                        ? 'border-primary shadow-md ring-2 ring-primary/30 scale-[0.98]'
                        : 'border-outline-variant/30 hover:border-outline-variant hover:shadow-xs'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Memory Photo'}
                      className="w-full h-full object-cover select-none"
                      loading="lazy"
                    />

                    {/* Checkbox badge */}
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary text-on-primary shadow-md scale-105'
                          : 'bg-black/40 text-white/80 group-hover:bg-black/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isSelected ? 'check' : 'circle'}
                      </span>
                    </div>

                    {/* Date badge */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 rounded-md bg-black/55 backdrop-blur-xs text-white text-[10px] font-medium truncate-single">
                      {photo.dateISO ? formatStandardDate(photo.dateISO).replace(/, \d{4}$/, '') : 'No Date'}
                      {photo.caption ? ` • ${photo.caption}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-surface-bright border-t border-outline-variant/20 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary hover:bg-surface-variant text-[12px] font-semibold border border-outline-variant/30 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
              <span>{isProcessingUpload ? 'Importing...' : 'Upload More'}</span>
            </button>
            {filteredPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-[11px] text-secondary hover:text-primary font-medium"
              >
                {filteredPhotos.every((p) => selectedIds.has(p.id)) ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full text-secondary hover:text-primary text-[12px] font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAttach}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-on-primary text-[12px] font-bold shadow-sm hover:bg-primary/95 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-[16px]">attach_file</span>
              <span>Attach {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Hidden Multiple File Upload Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>,
    document.body
  );
};
