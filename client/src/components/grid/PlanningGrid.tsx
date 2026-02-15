import React, { useMemo, useCallback, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellValueChangedEvent, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useGridStore } from '../../stores/gridStore';
import { gridDataApi } from '../../api/gridData';
import { buildColumnDefs } from './gridColumns';
import DisaggregationModal from './DisaggregationModal';
import toast from 'react-hot-toast';

const PlanningGrid: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);
  const {
    getRowData,
    getLeafTimePeriods,
    toggleNode,
    expandAll,
    collapseAll,
    updateValues,
    updateMeasureColor,
    loadGridData,
    isLoading,
    measures,
  } = useGridStore();

  const [disaggModal, setDisaggModal] = useState<{
    isOpen: boolean;
    nodeId: number;
    nodeName: string;
    measureId: number;
    measureName: string;
    timePeriodId: number;
    value: number;
  } | null>(null);

  const leafPeriods = getLeafTimePeriods();
  const rowData = useMemo(() => getRowData(), [
    useGridStore.getState().hierarchyTree,
    useGridStore.getState().expandedNodeIds,
    useGridStore.getState().values,
    useGridStore.getState().measures,
    useGridStore.getState().timePeriods,
  ]);

  const handleColorChange = useCallback(
    (measureId: number, color: string | null) => {
      updateMeasureColor(measureId, color);
    },
    [updateMeasureColor]
  );

  const columnDefs = useMemo(
    () => buildColumnDefs(leafPeriods, toggleNode, handleColorChange),
    [leafPeriods, toggleNode, handleColorChange]
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    []
  );

  const onCellValueChanged = useCallback(
    async (event: CellValueChangedEvent) => {
      const { data, colDef } = event;
      if (!colDef.field || !colDef.field.startsWith('p_')) return;

      const timePeriodId = parseInt(colDef.field.replace('p_', ''), 10);
      const newValue = data[colDef.field];

      if (newValue === null || newValue === undefined) return;

      // Check if this node has children
      if (data.hasChildren) {
        setDisaggModal({
          isOpen: true,
          nodeId: data.nodeId,
          nodeName: data.nodeName,
          measureId: data.measureId,
          measureName: data.measureName,
          timePeriodId,
          value: newValue,
        });
        return;
      }

      // Leaf node - direct save
      try {
        const res = await gridDataApi.updateCell({
          nodeId: data.nodeId,
          measureId: data.measureId,
          timePeriodId,
          value: newValue,
        });
        if (res.data.values) {
          updateValues(res.data.values);
        }
        toast.success('Cell updated');
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to update cell');
        loadGridData();
      }
    },
    [updateValues, loadGridData]
  );

  const handleDisaggConfirm = useCallback(
    async (method: 'proportional' | 'weighted', weightMeasureId?: number) => {
      if (!disaggModal) return;

      try {
        const res = await gridDataApi.updateCell({
          nodeId: disaggModal.nodeId,
          measureId: disaggModal.measureId,
          timePeriodId: disaggModal.timePeriodId,
          value: disaggModal.value,
          disaggregationMethod: method,
          weightMeasureId,
        });
        if (res.data.values) {
          updateValues(res.data.values);
        }
        toast.success('Value disaggregated');
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to disaggregate');
        loadGridData();
      }

      setDisaggModal(null);
    },
    [disaggModal, updateValues, loadGridData]
  );

  const handleDisaggCancel = useCallback(() => {
    setDisaggModal(null);
    loadGridData(); // Revert
  }, [loadGridData]);

  const getRowStyle = useCallback((params: any) => {
    const styles: any = {};
    if (params.data?.isFirstMeasure) {
      styles.borderTop = '1px solid #dee2e6';
    }
    if (params.data?.bgColor) {
      styles.backgroundColor = params.data.bgColor;
    }
    return Object.keys(styles).length > 0 ? styles : undefined;
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#868e96' }}>
        Loading planning grid...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
        backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6',
      }}>
        <button onClick={expandAll} style={toolbarBtnStyle}>
          Expand All
        </button>
        <button onClick={collapseAll} style={toolbarBtnStyle}>
          Collapse All
        </button>
        <button onClick={() => loadGridData()} style={toolbarBtnStyle}>
          Refresh
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#868e96' }}>
          {measures.length} measures &middot; {leafPeriods.length} periods
        </span>
      </div>

      {/* Grid */}
      <div className="ag-theme-alpine" style={{ flex: 1, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          onGridReady={onGridReady}
          getRowId={(params) => params.data.rowId}
          getRowStyle={getRowStyle}
          rowHeight={32}
          headerHeight={36}
          animateRows={false}
          suppressRowTransform={true}
          stopEditingWhenCellsLoseFocus={true}
        />
      </div>

      {/* Disaggregation Modal */}
      {disaggModal && (
        <DisaggregationModal
          isOpen={disaggModal.isOpen}
          nodeName={disaggModal.nodeName}
          measureName={disaggModal.measureName}
          onConfirm={handleDisaggConfirm}
          onCancel={handleDisaggCancel}
        />
      )}
    </div>
  );
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #dee2e6',
  borderRadius: 4,
  backgroundColor: 'white',
  cursor: 'pointer',
  fontSize: 13,
  color: '#495057',
};

export default PlanningGrid;
