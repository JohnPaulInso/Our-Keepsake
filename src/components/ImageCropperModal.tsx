// (2026-07-13) Add 1600px interactive pan/zoom ImageCropperModal per SKILL.md
import React, { useState, useRef, useEffect } from 'react';
import { uploadOptimizedImage } from '../utils/imageUploader';

// (2026-07-13) Set 1:1 ratio math & 'with my bb bambam' default; was 3x offset
interface ImageCropperModalProps {
  imageSrc: string;
  initialCaption?: string;
  initialTag?: string;
  onCancel: () => void;
  onComplete: (finalUrl: string, caption: string, tag: string) => void;
}

// (2026-07-13) Clamp object-position 0-100% & snap center; was raw offset
export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageSrc,
  initialCaption = 'with my bb bambam',
  initialTag = 'POLAROID',
  onCancel,
  onComplete,
}) => {
  const [zoom, setZoom] = useState(1);
  const [posPercent, setPosPercent] = useState({ x: 0.5, y: 0.5 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ clientX: 0, clientY: 0, startX: 0.5, startY: 0.5 });
  const [caption, setCaption] = useState(initialCaption || 'with my bb bambam');
  const [tag, setTag] = useState(initialTag || 'POLAROID');
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setDragging(true);
    setDragStart({
      clientX: e.clientX,
      clientY: e.clientY,
      startX: posPercent.x,
      startY: posPercent.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const deltaX = e.clientX - dragStart.clientX;
    const deltaY = e.clientY - dragStart.clientY;

    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const containerSize = container.clientWidth || 360;
    const natW = img.naturalWidth || containerSize;
    const natH = img.naturalHeight || containerSize;

    const scale = Math.max(containerSize / natW, containerSize / natH) * zoom;
    const dispW = natW * scale;
    const dispH = natH * scale;

    const excessX = dispW - containerSize;
    const excessY = dispH - containerSize;

    let nextX = 0.5;
    if (excessX > 1) {
      nextX = dragStart.startX - deltaX / excessX;
      nextX = Math.max(0, Math.min(1, nextX));
      if (Math.abs(nextX - 0.5) < 0.05) nextX = 0.5;
    }

    let nextY = 0.5;
    if (excessY > 1) {
      nextY = dragStart.startY - deltaY / excessY;
      nextY = Math.max(0, Math.min(1, nextY));
      if (Math.abs(nextY - 0.5) < 0.05) nextY = 0.5;
    }

    setPosPercent({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setDragging(false);
  };

  const handleConfirmCrop = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      const outputSize = 1600;
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fbf9f5';
        ctx.fillRect(0, 0, outputSize, outputSize);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const img = imgRef.current;
        const scale = Math.max(outputSize / img.naturalWidth, outputSize / img.naturalHeight) * zoom;
        const scaledW = img.naturalWidth * scale;
        const scaledH = img.naturalHeight * scale;

        const excessX = scaledW - outputSize;
        const excessY = scaledH - outputSize;

        const drawX = -excessX * posPercent.x;
        const drawY = -excessY * posPercent.y;

        ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
      }
      const highResDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const uploadedUrl = await uploadOptimizedImage(highResDataUrl);
      onComplete(
        uploadedUrl,
        caption.trim() || 'with my bb bambam',
        tag.trim().toUpperCase() || 'POLAROID'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isSnapped = posPercent.x === 0.5 && posPercent.y === 0.5;

  return (
    <div
      id="polaroid-cropper-overlay" // High-res polaroid cropper modal
      // (2026-07-13) Raise cropper z-index above stacked composer modal; was z-100
      className="fixed inset-0 z-[160] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-5 shadow-2xl border border-outline-variant/40 modal-animate-in flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">crop_rotate</span>
            <h3 className="font-headline-sm text-headline-sm text-primary">
              Position 1:1 Polaroid Frame
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Interactive Square Polaroid Preview - No black borders */}
        <div
          ref={containerRef}
          className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#fbf9f5] border-4 border-surface-bright shadow-inner cursor-grab active:cursor-grabbing select-none flex items-center justify-center touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            draggable={false}
            style={{
              objectFit: 'cover',
              objectPosition: `${posPercent.x * 100}% ${posPercent.y * 100}%`,
              transform: zoom > 1 ? `scale(${zoom})` : undefined,
              transformOrigin: `${posPercent.x * 100}% ${posPercent.y * 100}%`,
              transition: dragging ? 'none' : 'object-position 0.1s ease-out',
            }}
            className="w-full h-full pointer-events-none select-none block"
          />

          {isSnapped && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
              <div className="w-6 h-[1.5px] bg-primary/70 shadow-xs" />
              <div className="h-6 w-[1.5px] bg-primary/70 absolute shadow-xs" />
            </div>
          )}

          <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded bg-primary/85 text-on-primary font-label-md text-[10px] tracking-wider">
            Smart 1:1 • Drag to Position
          </div>

          <button
            type="button"
            onClick={() => {
              setPosPercent({ x: 0.5, y: 0.5 });
              setZoom(1);
            }}
            className="absolute top-2 right-2 z-20 px-2.5 py-1 rounded bg-surface-container-lowest/95 text-primary text-[10px] font-semibold border border-outline-variant/30 backdrop-blur-xs flex items-center gap-1 active:scale-95 transition-transform shadow-xs"
          >
            <span className="material-symbols-outlined text-[13px]">filter_center_focus</span>
            <span>Snap Center</span>
          </button>
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px] text-secondary">zoom_out</span>
          <input
            type="range"
            min="1"
            max="2.6"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom( parseFloat(e.target.value) )}
            className="flex-1 accent-primary cursor-pointer"
          />
          <span className="material-symbols-outlined text-[18px] text-secondary">zoom_in</span>
        </div>

        {/* Caption & Location Badge Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
              Handwritten Polaroid Caption
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="with my bb bambam"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-body-sm text-body-sm focus:outline-none border border-outline-variant/40"
            />
          </div>
          <div>
            <label className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
              Stamp Tag
            </label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="CAFE"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-primary font-label-md text-label-md uppercase focus:outline-none border border-outline-variant/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirmCrop}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[17px]">check</span>
            <span>{isProcessing ? 'Developing...' : 'Attach Polaroid'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
