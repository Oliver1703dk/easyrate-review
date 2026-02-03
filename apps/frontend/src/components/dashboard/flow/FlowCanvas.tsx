import { DEFAULT_FLOW, DASHBOARD_TEXT } from '@easyrate/shared';
import { FlowNode } from './FlowNode';
import { FlowConnector } from './FlowConnector';
import { FlowBranch } from './FlowBranch';
import { FlowChannelToggle } from './FlowChannelToggle';

interface FlowCanvasProps {
  smsEnabled: boolean;
  emailEnabled: boolean;
  onToggleChannel: (channel: 'sms' | 'email', enabled: boolean) => void;
  onNodeSelect: (nodeId: string) => void;
  selectedNodeId: string | null;
}

export function FlowCanvas({
  smsEnabled,
  emailEnabled,
  onToggleChannel,
  onNodeSelect,
  selectedNodeId,
}: FlowCanvasProps) {
  const flow = DEFAULT_FLOW;

  // Guard against DEFAULT_FLOW not being loaded
  if (!flow || !flow.nodes) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading flow configuration...
      </div>
    );
  }

  const getNode = (id: string) => {
    const node = flow.nodes.find((n) => n.id === id);
    if (!node) {
      console.error(`Flow node not found: ${id}`);
      return { id, type: 'trigger' as const, title: id, description: '', icon: 'CheckCircle' };
    }
    return node;
  };

  const hasActiveChannel = smsEnabled || emailEnabled;

  return (
    <div className="flex flex-col items-center py-8">
      {/* Trigger Node */}
      <FlowNode
        node={getNode('trigger')}
        isSelected={selectedNodeId === 'trigger'}
        onClick={() => onNodeSelect('trigger')}
      />

      <FlowConnector length="medium" />

      {/* Debug info */}
      <div className="mb-4 rounded bg-slate-100 p-2 text-xs">
        <div>
          SMS: {smsEnabled ? 'ON' : 'OFF'} | Email: {emailEnabled ? 'ON' : 'OFF'}
        </div>
        <div>SMS toggle disabled: {smsEnabled && !emailEnabled ? 'YES (last channel)' : 'NO'}</div>
        <div>
          Email toggle disabled: {emailEnabled && !smsEnabled ? 'YES (last channel)' : 'NO'}
        </div>
      </div>

      {/* Channel Nodes - Side by Side */}
      <div className="flex items-start gap-6">
        {/* SMS Channel */}
        <div className="flex flex-col items-center">
          <FlowNode
            node={getNode('sms')}
            isActive={smsEnabled}
            isSelected={selectedNodeId === 'sms'}
            onClick={() => onNodeSelect('sms')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{smsEnabled ? 'ON' : 'OFF'}</span>
              <FlowChannelToggle
                enabled={smsEnabled}
                onChange={(newValue) => onToggleChannel('sms', newValue)}
                disabled={smsEnabled && !emailEnabled}
              />
            </div>
          </FlowNode>
          {smsEnabled && <FlowConnector length="medium" />}
        </div>

        {/* Email Channel */}
        <div className="flex flex-col items-center">
          <FlowNode
            node={getNode('email')}
            isActive={emailEnabled}
            isSelected={selectedNodeId === 'email'}
            onClick={() => onNodeSelect('email')}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{emailEnabled ? 'ON' : 'OFF'}</span>
              <FlowChannelToggle
                enabled={emailEnabled}
                onChange={(newValue) => onToggleChannel('email', newValue)}
                disabled={emailEnabled && !smsEnabled}
              />
            </div>
          </FlowNode>
          {emailEnabled && <FlowConnector length="medium" />}
        </div>
      </div>

      {/* Merge back to single flow if any channel is active */}
      {hasActiveChannel && (
        <>
          {/* Merge lines */}
          <svg className="h-8 w-64" viewBox="0 0 256 32" fill="none">
            {smsEnabled && emailEnabled ? (
              <>
                <path
                  d="M64 0 L64 8 Q64 16 72 16 L128 16"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <path
                  d="M192 0 L192 8 Q192 16 184 16 L128 16"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <path d="M128 16 L128 32" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" />
              </>
            ) : (
              <path d="M128 0 L128 32" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" />
            )}
          </svg>

          {/* Landing Page Node */}
          <FlowNode
            node={getNode('landing')}
            isSelected={selectedNodeId === 'landing'}
            onClick={() => onNodeSelect('landing')}
          />

          <FlowConnector length="medium" />

          {/* Branch Node */}
          <FlowNode
            node={getNode('branch')}
            isSelected={selectedNodeId === 'branch'}
            onClick={() => onNodeSelect('branch')}
          />

          {/* Branch to Internal / External */}
          <FlowBranch
            leftNode={
              <FlowNode
                node={getNode('internal')}
                isSelected={selectedNodeId === 'internal'}
                onClick={() => onNodeSelect('internal')}
              />
            }
            rightNode={
              <FlowNode
                node={getNode('external')}
                isSelected={selectedNodeId === 'external'}
                onClick={() => onNodeSelect('external')}
              />
            }
          />

          {/* Merge to Thank You */}
          <svg className="h-12 w-96" viewBox="0 0 384 48" fill="none">
            <path
              d="M120 0 L120 16 Q120 24 128 24 L192 24"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <path
              d="M264 0 L264 16 Q264 24 256 24 L192 24"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <path d="M192 24 L192 48" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" />
          </svg>

          {/* Thank You Node */}
          <FlowNode
            node={getNode('thankyou')}
            isSelected={selectedNodeId === 'thankyou'}
            onClick={() => onNodeSelect('thankyou')}
          />
        </>
      )}

      {/* Warning if no channels active */}
      {!hasActiveChannel && (
        <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {DASHBOARD_TEXT?.flow?.validation?.atLeastOneRequired ||
            'Mindst én kanal skal være aktiv'}
        </div>
      )}
    </div>
  );
}
