import { create } from 'zustand';
import type { HierarchyNode, Measure, TimePeriod, FlatRow, GridDataResponse } from '../types';
import { gridDataApi } from '../api/gridData';
import { measuresApi } from '../api/measures';
import { flattenTreeToRows } from '../components/grid/gridHelpers';
import toast from 'react-hot-toast';

interface GridState {
  hierarchyTree: HierarchyNode[];
  measures: Measure[];
  timePeriods: TimePeriod[];
  values: Record<string, number | null>;
  expandedNodeIds: Set<number>;
  isLoading: boolean;
  error: string | null;

  loadGridData: (nodeId?: number) => Promise<void>;
  toggleNode: (nodeId: number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  updateValues: (newValues: Record<string, number | null>) => void;
  updateMeasureColor: (measureId: number, bgColor: string | null) => Promise<void>;
  getRowData: () => FlatRow[];
  getLeafTimePeriods: () => TimePeriod[];
}

function collectAllNodeIds(nodes: HierarchyNode[]): number[] {
  const ids: number[] = [];
  function walk(node: HierarchyNode) {
    ids.push(node.id);
    if (node.children) node.children.forEach(walk);
  }
  nodes.forEach(walk);
  return ids;
}

function collectLeafPeriods(periods: TimePeriod[]): TimePeriod[] {
  const leaves: TimePeriod[] = [];
  function walk(p: TimePeriod) {
    if (!p.children || p.children.length === 0) {
      leaves.push(p);
    } else {
      p.children.forEach(walk);
    }
  }
  periods.forEach(walk);
  return leaves.sort((a, b) => a.sort_order - b.sort_order);
}

export const useGridStore = create<GridState>((set, get) => ({
  hierarchyTree: [],
  measures: [],
  timePeriods: [],
  values: {},
  expandedNodeIds: new Set<number>(),
  isLoading: false,
  error: null,

  loadGridData: async (nodeId?: number) => {
    set({ isLoading: true, error: null });
    try {
      const res = await gridDataApi.loadData({ nodeId });
      const data: GridDataResponse = res.data;
      
      // Auto-expand top level nodes
      const topLevelIds = data.hierarchy.map(n => n.id);
      
      set({
        hierarchyTree: data.hierarchy,
        measures: data.measures,
        timePeriods: data.timePeriods,
        values: data.values,
        expandedNodeIds: new Set(topLevelIds),
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load grid data', isLoading: false });
    }
  },

  toggleNode: (nodeId: number) => {
    const { expandedNodeIds } = get();
    const newSet = new Set(expandedNodeIds);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    set({ expandedNodeIds: newSet });
  },

  expandAll: () => {
    const { hierarchyTree } = get();
    const allIds = collectAllNodeIds(hierarchyTree);
    set({ expandedNodeIds: new Set(allIds) });
  },

  collapseAll: () => {
    set({ expandedNodeIds: new Set() });
  },

  updateValues: (newValues: Record<string, number | null>) => {
    const { values } = get();
    set({ values: { ...values, ...newValues } });
  },

  updateMeasureColor: async (measureId: number, bgColor: string | null) => {
    const { measures } = get();
    // Optimistic update
    const updatedMeasures = measures.map(m =>
      m.id === measureId ? { ...m, bg_color: bgColor } : m
    );
    set({ measures: updatedMeasures });

    try {
      await measuresApi.updateColor(measureId, bgColor);
    } catch {
      // Rollback on failure
      set({ measures });
      toast.error('Failed to update measure color');
    }
  },

  getRowData: () => {
    const { hierarchyTree, measures, expandedNodeIds, values } = get();
    const leafPeriods = get().getLeafTimePeriods();
    return flattenTreeToRows(hierarchyTree, expandedNodeIds, measures, values, leafPeriods);
  },

  getLeafTimePeriods: () => {
    const { timePeriods } = get();
    return collectLeafPeriods(timePeriods);
  },
}));
