import type { HierarchyNode, Measure, TimePeriod, FlatRow } from '../../types';

export function flattenTreeToRows(
  tree: HierarchyNode[],
  expandedNodeIds: Set<number>,
  measures: Measure[],
  values: Record<string, number | null>,
  leafPeriods: TimePeriod[]
): FlatRow[] {
  const rows: FlatRow[] = [];

  function walkNode(node: HierarchyNode, level: number) {
    const hasChildren = !!(node.children && node.children.length > 0);
    const isExpanded = expandedNodeIds.has(node.id);

    measures.forEach((measure, measureIndex) => {
      const row: FlatRow = {
        rowId: `${node.id}_${measure.id}`,
        nodeId: node.id,
        nodeName: node.name,
        measureId: measure.id,
        measureName: measure.name,
        measureShortName: measure.short_name,
        dataType: measure.data_type,
        isEditable: measure.is_editable,
        level,
        hasChildren,
        isExpanded,
        measureIndex,
        isFirstMeasure: measureIndex === 0,
        bgColor: measure.bg_color ?? null,
      };

      // Add period values as dynamic columns
      leafPeriods.forEach((period) => {
        const key = `${node.id}:${measure.id}:${period.id}`;
        row[`p_${period.id}`] = values[key] ?? null;
      });

      rows.push(row);
    });

    // Recurse into children only if expanded
    if (hasChildren && isExpanded && node.children) {
      const sorted = [...node.children].sort((a, b) => a.sort_order - b.sort_order);
      sorted.forEach((child) => walkNode(child, level + 1));
    }
  }

  const sorted = [...tree].sort((a, b) => a.sort_order - b.sort_order);
  sorted.forEach((node) => walkNode(node, 0));
  return rows;
}
