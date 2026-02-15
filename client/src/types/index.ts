export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'planner' | 'viewer';
}

export interface HierarchyLevel {
  id: number;
  name: string;
  depth: number;
}

export interface HierarchyNode {
  id: number;
  name: string;
  level_id: number;
  parent_id: number | null;
  sort_order: number;
  children?: HierarchyNode[];
  level_name?: string;
}

export interface Measure {
  id: number;
  name: string;
  short_name: string;
  data_type: 'currency' | 'units' | 'percentage' | 'ratio';
  is_editable: boolean;
  formula: string | null;
  aggregation_type: 'SUM' | 'WEIGHTED_AVG' | 'AVG' | 'NONE';
  weight_measure_id: number | null;
  sort_order: number;
  format_pattern: string | null;
  bg_color: string | null;
}

export interface TimePeriod {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  parent_id: number | null;
  depth: number;
  sort_order: number;
  children?: TimePeriod[];
}

export interface TimeConfig {
  id: number;
  granularity: 'week' | 'month' | 'quarter';
  fiscal_year_start_month: number;
}

export interface Version {
  id: number;
  name: string;
  is_default: boolean;
}

export interface GridDataResponse {
  hierarchy: HierarchyNode[];
  timePeriods: TimePeriod[];
  measures: Measure[];
  values: Record<string, number | null>;
}

export interface FlatRow {
  rowId: string;
  nodeId: number;
  nodeName: string;
  measureId: number;
  measureName: string;
  measureShortName: string;
  dataType: string;
  isEditable: boolean;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  measureIndex: number;
  isFirstMeasure: boolean;
  bgColor: string | null;
  [key: string]: any; // For dynamic period columns p_1, p_2, etc.
}

export interface CellUpdateRequest {
  nodeId: number;
  measureId: number;
  timePeriodId: number;
  value: number;
  disaggregationMethod?: 'proportional' | 'weighted';
  weightMeasureId?: number;
  versionId?: number;
}
