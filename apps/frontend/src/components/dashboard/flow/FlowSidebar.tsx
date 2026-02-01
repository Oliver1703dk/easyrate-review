import { Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectOption } from '@easyrate/ui';
import { MessageSquare, Mail, Star } from 'lucide-react';
import { DASHBOARD_TEXT, LANDING_PAGE_TEXT } from '@easyrate/shared';
import type { Business } from '@easyrate/shared';
import { cn } from '@easyrate/ui/lib';

interface FlowSidebarProps {
  business: Business | null;
  selectedNodeId: string | null;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

export function FlowSidebar({ business, selectedNodeId, smsEnabled, emailEnabled }: FlowSidebarProps) {

  return (
    <div className="flex h-full w-80 flex-col gap-4 border-l bg-slate-50 p-4">
      {/* Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{DASHBOARD_TEXT?.flow?.sidebar?.title || 'Flow Oversigt'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {DASHBOARD_TEXT?.flow?.sidebar?.channelsActive || 'Aktive kanaler'}
            </p>
            <div className="flex gap-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  smsEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                )}
              >
                <MessageSquare className="h-3 w-3" />
                SMS
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  emailEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                )}
              >
                <Mail className="h-3 w-3" />
                Email
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Node Configuration Card */}
      {selectedNodeId === 'landing' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{DASHBOARD_TEXT?.flow?.sidebar?.nodeConfig || 'Node Konfiguration'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{DASHBOARD_TEXT?.flow?.sidebar?.ratingType || 'Bedømmelsestype'}</Label>
              <Select disabled defaultValue="stars">
                <SelectOption value="stars">1-5 Stjerner</SelectOption>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{DASHBOARD_TEXT?.flow?.sidebar?.headline || 'Overskrift'}</Label>
              <Input disabled defaultValue={LANDING_PAGE_TEXT?.ratingTitle || 'Hvordan var din oplevelse?'} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{DASHBOARD_TEXT?.flow?.sidebar?.subheadline || 'Undertitel'}</Label>
              <Input disabled defaultValue={LANDING_PAGE_TEXT?.ratingSubtitle || 'Tryk på stjernerne for at bedømme'} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{DASHBOARD_TEXT?.flow?.sidebar?.condition1 || 'Betingelse 1'}</Label>
              <Select disabled defaultValue="negative">
                <SelectOption value="negative">{DASHBOARD_TEXT?.flow?.branches?.negative || '1-3 stjerner'}</SelectOption>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{DASHBOARD_TEXT?.flow?.sidebar?.condition2 || 'Betingelse 2'}</Label>
              <Select disabled defaultValue="positive">
                <SelectOption value="positive">{DASHBOARD_TEXT?.flow?.branches?.positive || '4-5 stjerner'}</SelectOption>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landing Page Preview */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{DASHBOARD_TEXT?.flow?.sidebar?.landingPreview || 'Landing Page Preview'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border bg-white">
            {/* Phone mockup */}
            <div className="aspect-[9/16] p-4">
              {/* Logo placeholder */}
              <div
                className="mx-auto mb-6 h-12 w-12 rounded-lg"
                style={{ backgroundColor: business?.branding?.primaryColor || '#000' }}
              />

              {/* Title */}
              <h3 className="mb-2 text-center text-sm font-semibold">{LANDING_PAGE_TEXT?.ratingTitle || 'Hvordan var din oplevelse?'}</h3>
              <p className="mb-6 text-center text-xs text-muted-foreground">{LANDING_PAGE_TEXT?.ratingSubtitle || 'Tryk på stjernerne for at bedømme'}</p>

              {/* Star rating */}
              <div className="mb-6 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="h-6 w-6"
                    fill={star <= 4 ? '#facc15' : 'none'}
                    stroke={star <= 4 ? '#facc15' : '#d1d5db'}
                  />
                ))}
              </div>

              {/* Footer */}
              <p className="text-center text-[10px] text-muted-foreground">{LANDING_PAGE_TEXT?.ratingFooter || 'Det tager kun 10 sekunder'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
