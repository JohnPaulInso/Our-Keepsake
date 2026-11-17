// (2026-07-13) Add 1600px interactive pan/zoom ImageCropperModal per SKILL.md
import React, { useState, useRef, useEffect } from 'react';
import { uploadOptimizedImage } from '../utils/imageUploader';

interface ImageCropperModalProps {
  imageSrc: string;
  onCancel: () => void;
  onComplete: (finalUrl: string, caption: string, tag: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageSrc,
  onCancel,
  onComplete,
}) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [caption, setCaption] = useState('');
  const [tag, setTag] = useState('POLAROID');
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
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
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        const drawX = (outputSize - drawW) / 2 + offset.x * 3;
        const drawY = (outputSize - drawH) / 2 + offset.y * 3;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }
      const highResDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const uploadedUrl = await uploadOptimizedImage(highResDataUrl);
      onComplete(
        uploadedUrl,
        caption.trim() || 'Sweet instant with Zea',
        tag.trim().toUpperCase() || 'KEEPSAKE'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="polaroid-cropper-overlay" // High-res polaroid cropper modal
      className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
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
              Develop Polaroid Frame (1600px HD)
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

        {/* Interactive Square Polaroid Preview */}
        <div
          className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface-container-high border-4 border-surface-bright shadow-inner cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: dragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="max-w-none w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-primary/75 text-on-primary font-label-md text-[10px] tracking-wider">
            Drag to Pan • 0.92 Quality
          </div>
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
              placeholder="E.g., Zea laughing by the window..."
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
