// (2026-07-13) Add PIN 7777 sanctuary lock screen; was no startup passcode gate
import React, { useState, useEffect, useCallback } from 'react';
import { COUPLE_AVATAR_URL } from '../data/seedMemories';

interface PinLockModalProps {
  onUnlock: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const correctPin = '7777';

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        setErrorMsg('');
        if (nextPin.length === 4) {
          if (nextPin === correctPin) {
            setIsSuccess(true);
            try {
              sessionStorage.setItem('ok_sanctuary_pin_unlocked', 'true');
            } catch {
              // Ignore
            }
            setTimeout(() => {
              onUnlock();
            }, 350);
          } else {
            setIsShaking(true);
            setErrorMsg('Incorrect passcode. Enter 7777 to enter.');
            setTimeout(() => {
              setPin('');
              setIsShaking(false);
            }, 600);
          }
        }
      }
    },
    [pin, onUnlock]
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setErrorMsg('');
  }, []);

  // Support physical keyboard typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear]);

  return (
    <div
      id="pin-lock-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-md select-none transition-opacity duration-300"
    >
      {/* Subtle Paper Dot Texture Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#4a3b32_1px,transparent_1px)] [background-size:20px_20px]" />

      <div
        id="pin-lock-card"
        className={`relative z-10 w-full max-w-[360px] bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center transition-all ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Couple Ring / Avatar */}
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full ring-4 ring-secondary/30 overflow-hidden shadow-md bg-surface-container">
            <img
              src={COUPLE_AVATAR_URL}
              alt="JP & Zea"
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                img.src = COUPLE_AVATAR_URL;
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-xs text-[14px]">
            🔒
          </div>
        </div>

        {/* Title & Romantic Subtitle */}
        <h2 className="font-serif text-headline-sm sm:text-headline-md text-primary font-bold tracking-tight">
          Our Keepsake
        </h2>
        <p className="font-serif italic text-body-sm text-secondary mt-0.5 mb-1">
          JP &amp; Zea&apos;s Private Sanctuary
        </p>
        <p className="font-label-md text-[11px] text-on-surface-variant/80 uppercase tracking-wider mb-6">
          Enter 4-Digit Passcode
        </p>

        {/* 4 PIN Dots */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  filled
                    ? isSuccess
                      ? 'bg-emerald-600 scale-125'
                      : 'bg-primary scale-110 shadow-xs'
                    : 'bg-surface-container-high border-2 border-outline-variant/60'
                }`}
              />
            );
          })}
        </div>

        {/* Error or Success Notice */}
        <div className="h-5 mb-4 flex items-center justify-center">
          {errorMsg ? (
            <p className="text-error font-label-md text-xs font-medium animate-pulse">
              {errorMsg}
            </p>
          ) : isSuccess ? (
            <p className="text-emerald-700 font-label-md text-xs font-semibold">
              Unlocked! Opening sanctuary... 💕
            </p>
          ) : (
            <p className="text-secondary/60 font-label-md text-[11px]">
              Hint: 7777
            </p>
          )}
        </div>

        {/* Tactile Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-surface-container-low hover:bg-surface-container active:scale-95 text-primary font-serif font-semibold text-xl transition-all shadow-xs border border-outline-variant/30 flex items-center justify-center cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low active:scale-95 text-secondary font-label-md text-xs uppercase tracking-wider transition-all border border-outline-variant/20 flex items-center justify-center cursor-pointer"
          >
            Clear
          </button>

          {/* 0 Button */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-surface-container-low hover:bg-surface-container active:scale-95 text-primary font-serif font-semibold text-xl transition-all shadow-xs border border-outline-variant/30 flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-14 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low active:scale-95 text-primary font-serif font-semibold text-xl transition-all border border-outline-variant/20 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">backspace</span>
          </button>
        </div>

        {/* Footer info */}
        <p className="mt-6 font-label-md text-[10px] uppercase tracking-wider text-secondary/70">
          Only for JP &amp; Zea • No Google Sign-in Needed
        </p>
      </div>
    </div>
  );
};
