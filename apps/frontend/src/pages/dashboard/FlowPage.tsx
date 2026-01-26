import { useState, useEffect, Component, type ReactNode } from 'react';
import { Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { Header } from '../../components/dashboard/layout';
import { FlowCanvas, FlowSidebar } from '../../components/dashboard/flow';
import { useFlowSettings } from '../../hooks/useFlowSettings';

// Error boundary to catch rendering errors
class FlowErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FlowPage error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <h2 className="text-lg font-semibold text-destructive">Der opstod en fejl</h2>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message || 'Kunne ikke vise flow siden'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Genindlæs siden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function FlowPageContent() {
  const { business, channelSettings, isLoading, validationError, toggleChannel, clearValidationError } = useFlowSettings();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('landing');

  // Clear validation error after a delay
  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(clearValidationError, 3000);
      return () => clearTimeout(timer);
    }
  }, [validationError, clearValidationError]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={DASHBOARD_TEXT?.flow?.title || 'Flow / Automatisering'} subtitle={DASHBOARD_TEXT?.flow?.subtitle || 'Visualiser din anmeldelsesflow'} />

      {/* Validation Error Toast */}
      {validationError && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main Canvas Area */}
        <div className="flex-1 overflow-auto">
          <FlowCanvas
            smsEnabled={channelSettings.smsEnabled}
            emailEnabled={channelSettings.emailEnabled}
            onToggleChannel={toggleChannel}
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <FlowSidebar business={business} selectedNodeId={selectedNodeId} smsEnabled={channelSettings.smsEnabled} emailEnabled={channelSettings.emailEnabled} />
        </div>
      </div>
    </div>
  );
}

export function FlowPage() {
  return (
    <FlowErrorBoundary>
      <FlowPageContent />
    </FlowErrorBoundary>
  );
}
