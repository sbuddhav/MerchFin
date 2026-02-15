import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import type { TimePeriod } from '../../types';
import { formatCellValue, parseCellValue } from '../../utils/formatters';
import TreeCellRenderer from './TreeCellRenderer';

export function buildColumnDefs(
  leafPeriods: TimePeriod[],
  onToggleNode: (nodeId: number) => void,
  onColorChange: (measureId: number, color: string | null) => void
): ColDef[] {
  const hierarchyCol: ColDef = {
    headerName: 'Product / Measure',
    field: 'displayName',
    pinned: 'left' as const,
    width: 320,
    lockPosition: true,
    cellRenderer: TreeCellRenderer,
    cellRendererParams: { onToggleNode, onColorChange },
    editable: false,
    suppressMovable: true,
  };

  const periodCols: ColDef[] = leafPeriods.map((tp) => ({
    headerName: tp.label,
    field: `p_${tp.id}`,
    width: 130,
    editable: (params: any) => params.data?.isEditable === true,
    valueFormatter: (params: ValueFormatterParams) => {
      if (params.value === null || params.value === undefined) return '';
      return formatCellValue(params.value, params.data?.dataType || 'currency');
    },
    valueSetter: (params: any) => {
      const parsed = parseCellValue(String(params.newValue), params.data?.dataType || 'currency');
      if (parsed === null && params.newValue !== '' && params.newValue !== null) return false;
      params.data[`p_${tp.id}`] = parsed;
      return true;
    },
    cellStyle: (params: any) => {
      const styles: any = { textAlign: 'right' };
      if (params.data?.bgColor) {
        styles.backgroundColor = params.data.bgColor;
        if (!params.data?.isEditable) {
          styles.color = '#6c757d';
        }
      } else if (!params.data?.isEditable) {
        styles.backgroundColor = '#f8f9fa';
        styles.color = '#6c757d';
      }
      if (params.data?.isFirstMeasure) {
        styles.fontWeight = 600;
      }
      return styles;
    },
    type: 'numericColumn',
  }));

  return [hierarchyCol, ...periodCols];
}
