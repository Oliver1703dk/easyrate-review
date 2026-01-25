import { Card, CardContent, CardHeader, CardTitle, Label, Textarea } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface MessageTemplatesSectionProps {
  smsTemplate: string;
  emailTemplate: string;
  onSmsTemplateChange: (value: string) => void;
  onEmailTemplateChange: (value: string) => void;
}

export function MessageTemplatesSection({
  smsTemplate,
  emailTemplate,
  onSmsTemplateChange,
  onEmailTemplateChange,
}: MessageTemplatesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD_TEXT.settings.templates.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variables Help */}
        <div className="rounded-md bg-muted p-4">
          <p className="mb-2 text-sm font-medium">{DASHBOARD_TEXT.settings.templates.variables}</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>{DASHBOARD_TEXT.settings.templates.variableCustomerName}</li>
            <li>{DASHBOARD_TEXT.settings.templates.variableBusinessName}</li>
            <li>{DASHBOARD_TEXT.settings.templates.variableReviewLink}</li>
          </ul>
        </div>

        {/* SMS Template */}
        <div className="space-y-2">
          <Label htmlFor="smsTemplate">{DASHBOARD_TEXT.settings.templates.smsTemplate}</Label>
          <Textarea
            id="smsTemplate"
            value={smsTemplate}
            onChange={(e) => onSmsTemplateChange(e.target.value)}
            rows={3}
            placeholder="Hej {{customerName}}! Tak for dit besøg hos {{businessName}}. Del din oplevelse: {{reviewLink}}"
          />
          <p className="text-xs text-muted-foreground">
            {smsTemplate.length} / 160 tegn
          </p>
        </div>

        {/* Email Template */}
        <div className="space-y-2">
          <Label htmlFor="emailTemplate">{DASHBOARD_TEXT.settings.templates.emailTemplate}</Label>
          <Textarea
            id="emailTemplate"
            value={emailTemplate}
            onChange={(e) => onEmailTemplateChange(e.target.value)}
            rows={6}
            placeholder="Hej {{customerName}},&#10;&#10;Tak fordi du valgte {{businessName}}!&#10;&#10;Del din oplevelse: {{reviewLink}}"
          />
        </div>
      </CardContent>
    </Card>
  );
}
