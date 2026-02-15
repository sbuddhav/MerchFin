import { useEffect } from 'react';
import PlanningGrid from '../components/grid/PlanningGrid';
import { useGridStore } from '../stores/gridStore';

const PlanningPage: React.FC = () => {
  const loadGridData = useGridStore((s) => s.loadGridData);
  const error = useGridStore((s) => s.error);

  useEffect(() => {
    loadGridData();
  }, [loadGridData]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fff5f5',
          color: '#c92a2a',
          borderBottom: '1px solid #ffc9c9',
          fontSize: 13,
        }}>
          Error: {error}
        </div>
      )}
      <PlanningGrid />
    </div>
  );
};

export default PlanningPage;
