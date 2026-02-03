import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Switch,
  Textarea,
  Input,
} from '@easyrate/ui';
import { DASHBOARD_TEXT, SMS_TEMPLATES } from '@easyrate/shared';

interface SmsConfigPanelProps {
  template: string;
  delay: number;
  enabled: boolean;
  otherChannelEnabled: boolean;
  onTemplateChange: (value: string) => void;
  onDelayChange: (value: number) => void;
  onToggle: (enabled: boolean) => void;
}

const SMS_CHAR_LIMIT = 160;

export function SmsConfigPanel({
  template,
  delay,
  enabled,
  otherChannelEnabled,
  onTemplateChange,
  onDelayChange,
  onToggle,
}: SmsConfigPanelProps) {
  const sidebar = DASHBOARD_TEXT.flow.sidebar;
  const charCount = template.length;
  const isOverLimit = charCount > SMS_CHAR_LIMIT;

  const handleToggle = (checked: boolean) => {
    // Prevent disabling if this is the only active channel
    if (!checked && !otherChannelEnabled) {
      return;
    }
    onToggle(checked);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{sidebar.smsConfig}</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{sidebar.enabled}</Label>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={enabled && !otherChannelEnabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">{sidebar.messageTemplate}</Label>
          <Textarea
            value={template}
            onChange={(e) => {
              onTemplateChange(e.target.value);
            }}
            placeholder={SMS_TEMPLATES.reviewRequest}
            className="min-h-[100px] text-sm"
            disabled={!enabled}
          />
          <div className="flex justify-between text-xs">
            <span className={isOverLimit ? 'text-red-500' : 'text-muted-foreground'}>
              {charCount} / {SMS_CHAR_LIMIT} {sidebar.characterCount}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">{sidebar.delayMinutes}</Label>
          <Input
            type="number"
            min={0}
            value={delay}
            onChange={(e) => {
              onDelayChange(parseInt(e.target.value, 10) || 0);
            }}
            className="text-sm"
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground">{sidebar.delayHelp}</p>
        </div>

        <div className="rounded-md border bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium">{sidebar.variablesTitle}</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>{sidebar.variableCustomerName}</li>
            <li>{sidebar.variableBusinessName}</li>
            <li>{sidebar.variableReviewLink}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
