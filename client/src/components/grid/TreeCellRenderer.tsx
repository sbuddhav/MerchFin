import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import ColorPalette from './ColorPalette';

interface TreeCellRendererProps {
  data: any;
  onToggleNode: (nodeId: number) => void;
  onColorChange: (measureId: number, color: string | null) => void;
}

const TreeCellRenderer: React.FC<TreeCellRendererProps> = (props) => {
  const { data, onToggleNode, onColorChange } = props;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const colorDotRef = useRef<HTMLSpanElement>(null);

  if (!data) return null;

  const indent = data.level * 24;
  const isFirstMeasure = data.isFirstMeasure;

  const handleColorSelect = (color: string | null) => {
    onColorChange(data.measureId, color);
    setPaletteOpen(false);
  };

  return (
    <div
      style={{
        paddingLeft: `${indent}px`,
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        overflow: 'visible',
        whiteSpace: 'nowrap',
      }}
    >
      {isFirstMeasure && data.hasChildren && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onToggleNode(data.nodeId);
          }}
          style={{
            cursor: 'pointer',
            marginRight: 6,
            width: 16,
            fontSize: 10,
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {data.isExpanded ? '▼' : '▶'}
        </span>
      )}
      {isFirstMeasure && !data.hasChildren && (
        <span style={{ width: 22, display: 'inline-block' }} />
      )}
      {!isFirstMeasure && (
        <span style={{ width: 22, display: 'inline-block' }} />
      )}
      <span
        style={{
          fontWeight: isFirstMeasure ? 700 : 400,
          color: isFirstMeasure ? '#1a1a2e' : '#495057',
          fontSize: isFirstMeasure ? 13 : 12,
        }}
      >
        {isFirstMeasure ? data.nodeName : ''}
      </span>
      {isFirstMeasure && (
        <span style={{ color: '#868e96', marginLeft: 8, fontSize: 12 }}>
          {data.measureName}
        </span>
      )}
      {!isFirstMeasure && (
        <span style={{ color: '#868e96', fontSize: 12, paddingLeft: 0 }}>
          {data.measureName}
        </span>
      )}
      {/* Color dot */}
      <span
        ref={colorDotRef}
        onClick={(e) => {
          e.stopPropagation();
          setPaletteOpen(!paletteOpen);
        }}
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: data.bgColor || 'transparent',
          border: data.bgColor ? `2px solid ${data.bgColor}` : '1.5px solid #ced4da',
          display: 'inline-block',
          marginLeft: 6,
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: data.bgColor ? '0 0 0 1px rgba(0,0,0,0.1)' : 'none',
        }}
        title="Set row color"
      />
      {/* Color palette popover — rendered via portal to escape AG Grid overflow clipping */}
      {paletteOpen &&
        colorDotRef.current &&
        ReactDOM.createPortal(
          <ColorPalette
            anchorRect={colorDotRef.current.getBoundingClientRect()}
            onSelect={handleColorSelect}
            onClose={() => setPaletteOpen(false)}
            currentColor={data.bgColor}
          />,
          document.body
        )}
    </div>
  );
};

export default TreeCellRenderer;
