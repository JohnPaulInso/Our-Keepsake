// (2026-07-13) Build custom dropdown replacing native select per SKILL.md
import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  // (2026-07-13) Add dotColor support in dropdown; was icon only
  dotColor?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  label,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <span className="font-label-md text-label-md uppercase tracking-wider text-outline block mb-1">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-surface-container-low text-primary border border-outline-variant/40 shadow-sm active:scale-[0.99] transition-all text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.dotColor ? (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          ) : selectedOption?.icon ? (
            <span className="material-symbols-outlined text-[17px] text-secondary shrink-0">
              {selectedOption.icon}
            </span>
          ) : null}
          <span className="font-label-md text-label-md font-semibold text-primary truncate-single">
            {selectedOption?.label || 'Select'}
          </span>
        </div>
        <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 left-0 mt-1.5 z-50 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/50 py-1.5 modal-animate-in max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-secondary-container/70 text-primary font-semibold'
                    : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.dotColor ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: opt.dotColor }}
                    />
                  ) : opt.icon ? (
                    <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
                      {opt.icon}
                    </span>
                  ) : null}
                  <span className="font-body-sm text-body-sm truncate-single">{opt.label}</span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
