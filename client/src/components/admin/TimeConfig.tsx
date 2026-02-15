import React, { useState, useEffect, useCallback } from 'react';
import { timePeriodsApi } from '../../api/timePeriods';
import type { TimePeriod, TimeConfig as TimeConfigType } from '../../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const GRANULARITIES = ['week', 'month', 'quarter'] as const;

const TimeConfig: React.FC = () => {
  const [_config, setConfig] = useState<TimeConfigType | null>(null);
  const [periods, setPeriods] = useState<TimePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Config form
  const [granularity, setGranularity] = useState<string>('month');
  const [fiscalMonth, setFiscalMonth] = useState<number>(1);

  // Generate form
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  // Expand state for tree
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, periodsRes] = await Promise.all([
        timePeriodsApi.getConfig(),
        timePeriodsApi.getPeriods(),
      ]);
      const cfg = configRes.data;
      setConfig(cfg);
      setGranularity(cfg.granularity);
      setFiscalMonth(cfg.fiscal_year_start_month);
      setPeriods(periodsRes.data);
      // Auto-expand top-level periods
      const topIds = new Set<number>(periodsRes.data.map((p: TimePeriod) => p.id));
      setExpanded(topIds);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load time configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = async () => {
    try {
      setError('');
      await timePeriodsApi.updateConfig(granularity, fiscalMonth);
      setSuccess('Configuration saved successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save configuration');
    }
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError('Start date and end date are required');
      return;
    }
    try {
      setGenerating(true);
      setError('');
      await timePeriodsApi.generatePeriods(startDate, endDate, granularity);
      setSuccess('Time periods generated successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate periods');
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderPeriod = (period: TimePeriod, depth: number): React.ReactNode => {
    const hasChildren = period.children && period.children.length > 0;
    const isExpanded = expanded.has(period.id);

    const depthColors = ['#4263eb', '#37b24d', '#e67700', '#7048e8'];
    const dotColor = depthColors[depth % depthColors.length];

    return (
      <div key={period.id}>
        <div style={{ ...styles.periodRow, paddingLeft: 16 + depth * 28 }}>
          {hasChildren ? (
            <button onClick={() => toggleExpand(period.id)} style={styles.expandBtn}>
              {isExpanded ? '\u25BC' : '\u25B6'}
            </button>
          ) : (
            <span style={{ ...styles.dot, background: dotColor }} />
          )}
          <span style={{ ...styles.periodLabel, fontWeight: depth === 0 ? 600 : 500 }}>
            {period.label}
          </span>
          <span style={styles.periodDates}>
            {period.start_date} &mdash; {period.end_date}
          </span>
        </div>
        {isExpanded && hasChildren && period.children!.map((child) => renderPeriod(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return <div style={styles.page}><p style={styles.loadingText}>Loading time configuration...</p></div>;
  }

  return (
    <div style={styles.page}>
      {error && (
        <div style={styles.errorBar}>
          {error}
          <button onClick={() => setError('')} style={styles.errorClose}>&times;</button>
        </div>
      )}
      {success && (
        <div style={styles.successBar}>{success}</div>
      )}

      <div style={styles.topRow}>
        {/* ─── Config Card ─── */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Time Configuration</h3>
          <p style={styles.cardDesc}>Set the granularity and fiscal year start for your planning calendar.</p>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Granularity</label>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
                style={styles.select}
              >
                {GRANULARITIES.map((g) => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Fiscal Year Start Month</label>
              <select
                value={fiscalMonth}
                onChange={(e) => setFiscalMonth(Number(e.target.value))}
                style={styles.select}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={handleSaveConfig} style={styles.primaryBtn}>
            Save Configuration
          </button>
        </div>

        {/* ─── Generate Card ─── */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Generate Periods</h3>
          <p style={styles.cardDesc}>Generate time period hierarchies for a date range.</p>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              ...styles.primaryBtn,
              opacity: generating ? 0.7 : 1,
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? 'Generating...' : 'Generate Periods'}
          </button>
        </div>
      </div>

      {/* ─── Periods Tree ─── */}
      <div style={styles.treeCard}>
        <h3 style={styles.cardTitle}>Current Time Periods</h3>
        <p style={styles.cardDesc}>
          {periods.length > 0
            ? `${periods.length} top-level period(s) configured.`
            : 'No time periods generated yet.'}
        </p>

        <div style={styles.treeContainer}>
          {periods.length === 0 ? (
            <p style={styles.emptyText}>
              Configure your settings above and generate periods to see the time hierarchy.
            </p>
          ) : (
            periods.map((p) => renderPeriod(p, 0))
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
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', marginBottom: 16, background: '#fff5f5',
    border: '1px solid #ffc9c9', borderRadius: 6, color: '#c92a2a', fontSize: 13,
  },
  errorClose: {
    background: 'none', border: 'none', color: '#c92a2a', fontSize: 18, cursor: 'pointer', padding: '0 4px',
  },
  successBar: {
    padding: '10px 16px', marginBottom: 16, background: '#ebfbee',
    border: '1px solid #b2f2bb', borderRadius: 6, color: '#2b8a3e', fontSize: 13,
  },
  topRow: {
    display: 'flex',
    gap: 24,
    marginBottom: 24,
    flexWrap: 'wrap' as const,
  },
  card: {
    flex: 1,
    minWidth: 320,
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #dee2e6',
    padding: 24,
  },
  treeCard: {
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #dee2e6',
    padding: 24,
  },
  cardTitle: { margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#212529' },
  cardDesc: { margin: '0 0 20px', fontSize: 12, color: '#868e96' },
  formGrid: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  field: {
    flex: 1,
    minWidth: 140,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 500,
    color: '#495057',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid #dee2e6',
    borderRadius: 6,
    outline: 'none',
    color: '#212529',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid #dee2e6',
    borderRadius: 6,
    outline: 'none',
    color: '#212529',
    background: '#fff',
    boxSizing: 'border-box' as const,
  },
  primaryBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    background: '#4263eb',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  treeContainer: {
    maxHeight: 500,
    overflowY: 'auto',
  },
  periodRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    minHeight: 30,
  },
  expandBtn: {
    width: 18,
    height: 18,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#868e96',
    fontSize: 9,
    flexShrink: 0,
    padding: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
    margin: '0 6px',
  },
  periodLabel: {
    fontSize: 13,
    color: '#212529',
  },
  periodDates: {
    fontSize: 11,
    color: '#868e96',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 13, color: '#868e96', textAlign: 'center', padding: '40px 0',
  },
};

export default TimeConfig;
