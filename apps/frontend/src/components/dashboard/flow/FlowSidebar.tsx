import type { Business } from '@easyrate/shared';
import {
  SmsConfigPanel,
  EmailConfigPanel,
  TriggerInfoPanel,
  LandingInfoPanel,
  BranchInfoPanel,
  InternalFeedbackInfoPanel,
  ExternalReviewInfoPanel,
  ThankYouInfoPanel,
  FlowOverviewPanel,
} from './panels';

interface FlowSidebarProps {
  business: Business | null;
  selectedNodeId: string | null;
  smsEnabled: boolean;
  emailEnabled: boolean;
  smsTemplate: string;
  emailTemplate: string;
  delayMinutes: number;
  onSmsTemplateChange: (value: string) => void;
  onEmailTemplateChange: (value: string) => void;
  onDelayChange: (value: number) => void;
  onToggleChannel: (channel: 'sms' | 'email', enabled: boolean) => void;
}

export function FlowSidebar({
  business,
  selectedNodeId,
  smsEnabled,
  emailEnabled,
  smsTemplate,
  emailTemplate,
  delayMinutes,
  onSmsTemplateChange,
  onEmailTemplateChange,
  onDelayChange,
  onToggleChannel,
}: FlowSidebarProps) {
  const renderPanel = () => {
    switch (selectedNodeId) {
      case 'sms':
        return (
          <SmsConfigPanel
            template={smsTemplate}
            delay={delayMinutes}
            enabled={smsEnabled}
            otherChannelEnabled={emailEnabled}
            onTemplateChange={onSmsTemplateChange}
            onDelayChange={onDelayChange}
            onToggle={(enabled) => {
              onToggleChannel('sms', enabled);
            }}
          />
        );

      case 'email':
        return (
          <EmailConfigPanel
            template={emailTemplate}
            delay={delayMinutes}
            enabled={emailEnabled}
            otherChannelEnabled={smsEnabled}
            onTemplateChange={onEmailTemplateChange}
            onDelayChange={onDelayChange}
            onToggle={(enabled) => {
              onToggleChannel('email', enabled);
            }}
          />
        );

      case 'trigger':
        return <TriggerInfoPanel />;

      case 'landing':
        return <LandingInfoPanel business={business} />;

      case 'branch':
        return <BranchInfoPanel />;

      case 'internal':
        return <InternalFeedbackInfoPanel />;

      case 'external':
        return <ExternalReviewInfoPanel />;

      case 'thankyou':
        return <ThankYouInfoPanel />;

      default:
        return <FlowOverviewPanel smsEnabled={smsEnabled} emailEnabled={emailEnabled} />;
    }
  };

  return (
    <div className="flex h-full w-80 flex-col gap-4 border-l bg-slate-50 p-4 overflow-y-auto">
      {renderPanel()}
    </div>
  );
}
