import React, { useState, useEffect, useCallback } from 'react';
import { measuresApi } from '../../api/measures';
import type { Measure } from '../../types';

const DATA_TYPES = ['currency', 'units', 'percentage', 'ratio'] as const;
const AGG_TYPES = ['SUM', 'WEIGHTED_AVG', 'AVG', 'NONE'] as const;

interface MeasureForm {
  name: string;
  short_name: string;
  data_type: Measure['data_type'];
  is_editable: boolean;
  formula: string;
  aggregation_type: Measure['aggregation_type'];
  format_pattern: string;
}

const emptyForm: MeasureForm = {
  name: '',
  short_name: '',
  data_type: 'currency',
  is_editable: true,
  formula: '',
  aggregation_type: 'SUM',
  format_pattern: '',
};

const MeasureConfig: React.FC = () => {
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<MeasureForm>({ ...emptyForm });

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MeasureForm>({ ...emptyForm });

  const fetchMeasures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await measuresApi.getAll();
      setMeasures(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load measures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeasures();
  }, [fetchMeasures]);

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.short_name.trim()) {
      setError('Name and short name are required');
      return;
    }
    try {
      await measuresApi.create({
        name: addForm.name.trim(),
        short_name: addForm.short_name.trim(),
        data_type: addForm.data_type,
        is_editable: addForm.is_editable,
        formula: addForm.is_editable ? null : (addForm.formula.trim() || null),
        aggregation_type: addForm.aggregation_type,
        format_pattern: addForm.format_pattern.trim() || null,
      });
      setAddForm({ ...emptyForm });
      setShowAddForm(false);
      fetchMeasures();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create measure');
    }
  };

  const startEdit = (m: Measure) => {
    setEditingId(m.id);
    setEditForm({
      name: m.name,
      short_name: m.short_name,
      data_type: m.data_type,
      is_editable: m.is_editable,
      formula: m.formula || '',
      aggregation_type: m.aggregation_type,
      format_pattern: m.format_pattern || '',
    });
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    try {
      await measuresApi.update(editingId, {
        name: editForm.name.trim(),
        short_name: editForm.short_name.trim(),
        data_type: editForm.data_type,
        is_editable: editForm.is_editable,
        formula: editForm.is_editable ? null : (editForm.formula.trim() || null),
        aggregation_type: editForm.aggregation_type,
        format_pattern: editForm.format_pattern.trim() || null,
      });
      setEditingId(null);
      fetchMeasures();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update measure');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this measure? This cannot be undone.')) return;
    try {
      await measuresApi.delete(id);
      fetchMeasures();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete measure');
    }
  };

  const renderFormRow = (
    form: MeasureForm,
    setForm: React.Dispatch<React.SetStateAction<MeasureForm>>,
    onSave: () => void,
    onCancel: () => void,
    saveLabel: string,
  ) => (
    <tr>
      <td style={styles.td}>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          style={styles.cellInput}
          placeholder="Measure name"
        />
      </td>
      <td style={styles.td}>
        <input
          value={form.short_name}
          onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value }))}
          style={{ ...styles.cellInput, width: 80 }}
          placeholder="Short"
        />
      </td>
      <td style={styles.td}>
        <select
          value={form.data_type}
          onChange={(e) => setForm((f) => ({ ...f, data_type: e.target.value as Measure['data_type'] }))}
          style={styles.cellSelect}
        >
          {DATA_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </td>
      <td style={{ ...styles.td, textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={form.is_editable}
          onChange={(e) => setForm((f) => ({ ...f, is_editable: e.target.checked }))}
        />
      </td>
      <td style={styles.td}>
        {!form.is_editable && (
          <input
            value={form.formula}
            onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value }))}
            style={styles.cellInput}
            placeholder="e.g. revenue / units"
          />
        )}
      </td>
      <td style={styles.td}>
        <select
          value={form.aggregation_type}
          onChange={(e) => setForm((f) => ({ ...f, aggregation_type: e.target.value as Measure['aggregation_type'] }))}
          style={styles.cellSelect}
        >
          {AGG_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </td>
      <td style={styles.td}>
        <input
          value={form.format_pattern}
          onChange={(e) => setForm((f) => ({ ...f, format_pattern: e.target.value }))}
          style={{ ...styles.cellInput, width: 80 }}
          placeholder="$#,##0"
        />
      </td>
      <td style={styles.td}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onSave} style={styles.saveBtnSmall}>{saveLabel}</button>
          <button onClick={onCancel} style={styles.cancelBtnSmall}>Cancel</button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return <div style={styles.page}><p style={styles.loadingText}>Loading measures...</p></div>;
  }

  return (
    <div style={styles.page}>
      {error && (
        <div style={styles.errorBar}>
          {error}
          <button onClick={() => setError('')} style={styles.errorClose}>&times;</button>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Measures</h3>
            <p style={styles.cardDesc}>Define the KPIs and metrics for your planning grid.</p>
          </div>
          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)} style={styles.primaryBtn}>
              + Add Measure
            </button>
          )}
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Short Name</th>
                <th style={styles.th}>Data Type</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Editable</th>
                <th style={styles.th}>Formula</th>
                <th style={styles.th}>Aggregation</th>
                <th style={styles.th}>Format</th>
                <th style={{ ...styles.th, width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {measures.map((m) =>
                editingId === m.id ? (
                  renderFormRow(editForm, setEditForm, handleSaveEdit, () => setEditingId(null), 'Save')
                ) : (
                  <tr key={m.id}>
                    <td style={styles.td}>
                      <span style={styles.measureName}>{m.name}</span>
                    </td>
                    <td style={styles.td}>
                      <code style={styles.codeTag}>{m.short_name}</code>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.typeBadge}>{m.data_type}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {m.is_editable ? (
                        <span style={{ color: '#37b24d', fontWeight: 600, fontSize: 12 }}>Yes</span>
                      ) : (
                        <span style={{ color: '#868e96', fontSize: 12 }}>No</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {m.formula ? <code style={styles.formulaCode}>{m.formula}</code> : <span style={{ color: '#ced4da' }}>--</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.aggBadge}>{m.aggregation_type}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 12, color: '#495057' }}>{m.format_pattern || '--'}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => startEdit(m)} style={styles.actionBtn}>Edit</button>
                        <button onClick={() => handleDelete(m.id)} style={styles.actionBtnDanger}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {showAddForm &&
                renderFormRow(addForm, setAddForm, handleAdd, () => { setShowAddForm(false); setAddForm({ ...emptyForm }); }, 'Add')
              }
            </tbody>
          </table>

          {measures.length === 0 && !showAddForm && (
            <p style={styles.emptyText}>No measures configured yet. Click "Add Measure" to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingText: { color: '#868e96', fontSize: 14 },
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    marginBottom: 16,
    background: '#fff5f5',
    border: '1px solid #ffc9c9',
    borderRadius: 6,
    color: '#c92a2a',
    fontSize: 13,
  },
  errorClose: {
    background: 'none', border: 'none', color: '#c92a2a', fontSize: 18, cursor: 'pointer', padding: '0 4px',
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #dee2e6',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
  },
  cardTitle: { margin: 0, fontSize: 15, fontWeight: 600, color: '#212529' },
  cardDesc: { margin: '4px 0 0', fontSize: 12, color: '#868e96' },
  primaryBtn: {
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    background: '#4263eb',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: '#868e96',
    textAlign: 'left',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    background: '#f8f9fa',
    borderTop: '1px solid #dee2e6',
    borderBottom: '1px solid #dee2e6',
  },
  td: {
    padding: '10px 14px',
    fontSize: 13,
    color: '#495057',
    borderBottom: '1px solid #f1f3f5',
    verticalAlign: 'middle',
  },
  measureName: { fontWeight: 500, color: '#212529' },
  codeTag: {
    fontSize: 11, padding: '2px 6px', background: '#f1f3f5', borderRadius: 3, color: '#495057',
    fontFamily: 'SFMono-Regular, Consolas, monospace',
  },
  typeBadge: {
    fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#e7f5ff', color: '#1971c2', fontWeight: 500,
  },
  aggBadge: {
    fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f3f0ff', color: '#7048e8', fontWeight: 500,
  },
  formulaCode: {
    fontSize: 11, padding: '2px 6px', background: '#fff9db', borderRadius: 3, color: '#e67700',
    fontFamily: 'SFMono-Regular, Consolas, monospace',
  },
  cellInput: {
    width: '100%',
    padding: '5px 8px',
    fontSize: 13,
    border: '1px solid #4263eb',
    borderRadius: 4,
    outline: 'none',
    color: '#212529',
    boxSizing: 'border-box' as const,
  },
  cellSelect: {
    padding: '5px 8px',
    fontSize: 12,
    border: '1px solid #4263eb',
    borderRadius: 4,
    outline: 'none',
    color: '#212529',
    background: '#fff',
  },
  actionBtn: {
    padding: '4px 8px', fontSize: 11, color: '#495057', background: '#f8f9fa',
    border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer',
  },
  actionBtnDanger: {
    padding: '4px 8px', fontSize: 11, color: '#c92a2a', background: '#fff5f5',
    border: '1px solid #ffc9c9', borderRadius: 4, cursor: 'pointer',
  },
  saveBtnSmall: {
    padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#fff', background: '#4263eb',
    border: 'none', borderRadius: 4, cursor: 'pointer',
  },
  cancelBtnSmall: {
    padding: '4px 10px', fontSize: 11, color: '#495057', background: '#f8f9fa',
    border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer',
  },
  emptyText: {
    fontSize: 13, color: '#868e96', textAlign: 'center', padding: '40px 0',
  },
};

export default MeasureConfig;
