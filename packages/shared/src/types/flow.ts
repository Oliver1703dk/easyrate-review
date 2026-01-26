// Flow visualization types for the admin dashboard

export type FlowNodeType = 'trigger' | 'channel' | 'page' | 'branch' | 'outcome';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  title: string;
  description: string;
  icon: string;
  toggleable?: boolean;
  settingsKey?: 'smsEnabled' | 'emailEnabled';
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  version: string;
}
