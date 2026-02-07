import { useState } from 'react';
import { Loader2, Send, ExternalLink, RefreshCw, Phone, Mail, User } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';
import { useTestOrder } from '../../../hooks/useTestOrder';
import { NotificationStatusBadge } from './NotificationStatusBadge';

export function TestOrderCard() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const { submit, reset, notifications, isSubmitting, error, reviewLink } = useTestOrder();

  const handleSubmit = () => {
    if (!phone && !email) return;
    const input: { phone?: string; email?: string; customerName?: string } = {};
    if (phone) input.phone = phone;
    if (email) input.email = email;
    if (customerName) input.customerName = customerName;
    void submit(input);
  };

  const hasSubmitted = notifications.length > 0;
  const canSubmit = (phone || email) && !isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD_TEXT.test.sendTestTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSubmitted ? (
          <>
            <p className="text-sm text-muted-foreground">
              {DASHBOARD_TEXT.test.sendTestDescription}
            </p>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {DASHBOARD_TEXT.test.phoneLabel}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={DASHBOARD_TEXT.test.phonePlaceholder}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {DASHBOARD_TEXT.test.emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={DASHBOARD_TEXT.test.emailPlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {DASHBOARD_TEXT.test.customerNameLabel}
              </Label>
              <Input
                id="customerName"
                placeholder={DASHBOARD_TEXT.test.customerNamePlaceholder}
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                }}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {!phone && !email && (
              <p className="text-sm text-muted-foreground">{DASHBOARD_TEXT.test.validationError}</p>
            )}

            <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {DASHBOARD_TEXT.test.sending}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {DASHBOARD_TEXT.test.sendButton}
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <h4 className="font-medium">{DASHBOARD_TEXT.test.statusTitle}</h4>
              {notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    {n.type === 'sms' ? (
                      <Phone className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    <span className="text-sm">
                      {n.type === 'sms' ? DASHBOARD_TEXT.test.smsTo : DASHBOARD_TEXT.test.emailTo}{' '}
                      {n.recipient}
                    </span>
                  </div>
                  <NotificationStatusBadge status={n.status} />
                </div>
              ))}
            </div>

            {reviewLink && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(reviewLink, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {DASHBOARD_TEXT.test.openTestLink}
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {DASHBOARD_TEXT.test.sendAnother}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
