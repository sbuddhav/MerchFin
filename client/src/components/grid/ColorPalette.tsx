import React, { useRef, useEffect } from 'react';

interface ColorPaletteProps {
  anchorRect: DOMRect;
  onSelect: (color: string | null) => void;
  onClose: () => void;
  currentColor: string | null;
}

const PRESET_COLORS = [
  '#FFE8CC', // light orange
  '#FFF3BF', // light yellow
  '#D3F9D8', // light green
  '#C3FAE8', // light teal
  '#D0EBFF', // light blue
  '#E5DBFF', // light purple
  '#FFD8E4', // light pink
  '#FFC9C9', // light red
  '#E9ECEF', // light gray
  '#D0BFFF', // lavender
];

const ColorPalette: React.FC<ColorPaletteProps> = ({
  anchorRect,
  onSelect,
  onClose,
  currentColor,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Position below the anchor, clamped to viewport
  const top = Math.min(anchorRect.bottom + 4, window.innerHeight - 80);
  const left = Math.min(anchorRect.left, window.innerWidth - 160);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 9999,
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: 6,
        padding: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 4,
      }}
    >
      {PRESET_COLORS.map((color) => (
        <div
          key={color}
          onClick={() => onSelect(color)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: color,
            cursor: 'pointer',
            border:
              currentColor === color
                ? '2px solid #4263eb'
                : '1px solid #ced4da',
            boxSizing: 'border-box',
          }}
          title={color}
        />
      ))}
      {/* Clear button */}
      <div
        onClick={() => onSelect(null)}
        style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          backgroundColor: '#fff',
          cursor: 'pointer',
          border: '1px solid #ced4da',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: '#868e96',
          boxSizing: 'border-box',
        }}
        title="Clear color"
      >
        ×
      </div>
    </div>
  );
};

export default ColorPalette;
