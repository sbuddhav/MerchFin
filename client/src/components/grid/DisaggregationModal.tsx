import React, { useState } from 'react';

interface DisaggregationModalProps {
  isOpen: boolean;
  nodeName: string;
  measureName: string;
  onConfirm: (method: 'proportional' | 'weighted', weightMeasureId?: number) => void;
  onCancel: () => void;
}

const DisaggregationModal: React.FC<DisaggregationModalProps> = ({
  isOpen,
  nodeName,
  measureName,
  onConfirm,
  onCancel,
}) => {
  const [method, setMethod] = useState<'proportional' | 'weighted'>('proportional');

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: 8, padding: 24,
        minWidth: 400, maxWidth: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a1a2e' }}>
          Disaggregate Value
        </h3>
        <p style={{ color: '#495057', fontSize: 14, marginBottom: 16 }}>
          You're editing <strong>{measureName}</strong> for <strong>{nodeName}</strong>, which has children.
          How should the new value be distributed?
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="method"
              value="proportional"
              checked={method === 'proportional'}
              onChange={() => setMethod('proportional')}
              style={{ marginRight: 8 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Proportional</div>
              <div style={{ fontSize: 12, color: '#868e96' }}>
                Distribute based on current child ratios
              </div>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="method"
              value="weighted"
              checked={method === 'weighted'}
              onChange={() => setMethod('weighted')}
              style={{ marginRight: 8 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Weighted</div>
              <div style={{ fontSize: 12, color: '#868e96' }}>
                Distribute using configured weight measure
              </div>
            </div>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', border: '1px solid #dee2e6', borderRadius: 4,
              backgroundColor: 'white', cursor: 'pointer', fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(method)}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 4,
              backgroundColor: '#4263eb', color: 'white', cursor: 'pointer', fontSize: 14,
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisaggregationModal;
