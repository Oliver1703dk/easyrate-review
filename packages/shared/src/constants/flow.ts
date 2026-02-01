// Default flow configuration for the review collection workflow

import type { FlowDefinition } from '../types/flow.js';

export const DEFAULT_FLOW: FlowDefinition = {
  version: '1.0',
  nodes: [
    {
      id: 'trigger',
      type: 'trigger',
      title: 'order_complete',
      description: 'order_complete_desc',
      icon: 'ShoppingBag',
    },
    {
      id: 'sms',
      type: 'channel',
      title: 'send_sms',
      description: 'send_sms_desc',
      icon: 'MessageSquare',
      toggleable: true,
      settingsKey: 'smsEnabled',
    },
    {
      id: 'email',
      type: 'channel',
      title: 'send_email',
      description: 'send_email_desc',
      icon: 'Mail',
      toggleable: true,
      settingsKey: 'emailEnabled',
    },
    {
      id: 'landing',
      type: 'page',
      title: 'landing_page',
      description: 'landing_page_desc',
      icon: 'Star',
    },
    {
      id: 'branch',
      type: 'branch',
      title: 'rating_branch',
      description: 'rating_branch_desc',
      icon: 'GitBranch',
    },
    {
      id: 'internal',
      type: 'outcome',
      title: 'internal_feedback',
      description: 'internal_feedback_desc',
      icon: 'MessageCircle',
    },
    {
      id: 'external',
      type: 'outcome',
      title: 'external_review',
      description: 'external_review_desc',
      icon: 'ExternalLink',
    },
    {
      id: 'thankyou',
      type: 'outcome',
      title: 'thank_you',
      description: 'thank_you_desc',
      icon: 'CheckCircle',
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'sms' },
    { id: 'e2', source: 'trigger', target: 'email' },
    { id: 'e3', source: 'sms', target: 'landing' },
    { id: 'e4', source: 'email', target: 'landing' },
    { id: 'e5', source: 'landing', target: 'branch' },
    { id: 'e6', source: 'branch', target: 'internal', label: 'negative' },
    { id: 'e7', source: 'branch', target: 'external', label: 'positive' },
    { id: 'e8', source: 'internal', target: 'thankyou' },
    { id: 'e9', source: 'external', target: 'thankyou' },
  ],
};

// Node type colors for visual styling
export const FLOW_NODE_COLORS: Record<string, string> = {
  trigger: 'blue',
  channel: 'green',
  page: 'purple',
  branch: 'yellow',
  outcome: 'orange',
};
