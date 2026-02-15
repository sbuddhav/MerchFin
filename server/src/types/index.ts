import { Request } from 'express';

export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'planner' | 'viewer';
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: 'admin' | 'planner' | 'viewer';
  };
}

export interface HierarchyLevel {
  id: number;
  name: string;
  depth: number;
  created_at: Date;
}

export interface HierarchyNode {
  id: number;
  name: string;
  level_id: number;
  parent_id: number | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface TimePeriod {
  id: number;
  label: string;
  start_date: Date;
  end_date: Date;
  parent_id: number | null;
  depth: number;
  sort_order: number;
  created_at: Date;
  children?: TimePeriod[];
}

export interface TimeConfig {
  id: number;
  granularity: 'week' | 'month' | 'quarter';
  fiscal_year_start_month: number;
  updated_at: Date;
}

export interface CellValue {
  id: number;
  node_id: number;
  measure_id: number;
  time_period_id: number;
  value: number | null;
  version_id: number;
  updated_by: number | null;
  updated_at: Date;
}

export interface Version {
  id: number;
  name: string;
  is_default: boolean;
  created_by: number | null;
  created_at: Date;
}

export interface CellUpdate {
  nodeId: number;
  measureId: number;
  timePeriodId: number;
  value: number;
}

export interface GridDataResponse {
  hierarchy: HierarchyNode[];
  timePeriods: TimePeriod[];
  measures: Measure[];
  values: Record<string, number | null>;
}
