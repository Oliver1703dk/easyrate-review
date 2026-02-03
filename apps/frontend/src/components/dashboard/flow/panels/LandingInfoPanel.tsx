import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectOption,
} from '@easyrate/ui';
import { Star } from 'lucide-react';
import { DASHBOARD_TEXT, LANDING_PAGE_TEXT } from '@easyrate/shared';
import type { Business } from '@easyrate/shared';

interface LandingInfoPanelProps {
  business: Business | null;
}

export function LandingInfoPanel({ business }: LandingInfoPanelProps) {
  const sidebar = DASHBOARD_TEXT.flow.sidebar;
  const branches = DASHBOARD_TEXT.flow.branches;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{sidebar.nodeConfig}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">{sidebar.ratingType}</Label>
            <Select disabled defaultValue="stars">
              <SelectOption value="stars">1-5 Stjerner</SelectOption>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{sidebar.headline}</Label>
            <Input disabled defaultValue={LANDING_PAGE_TEXT.ratingTitle} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{sidebar.subheadline}</Label>
            <Input disabled defaultValue={LANDING_PAGE_TEXT.ratingSubtitle} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{sidebar.condition1}</Label>
            <Select disabled defaultValue="negative">
              <SelectOption value="negative">{branches.negative}</SelectOption>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{sidebar.condition2}</Label>
            <Select disabled defaultValue="positive">
              <SelectOption value="positive">{branches.positive}</SelectOption>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Landing Page Preview */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{sidebar.landingPreview}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border bg-white">
            <div className="aspect-[9/16] p-4">
              <div
                className="mx-auto mb-6 h-12 w-12 rounded-lg"
                style={{ backgroundColor: business?.branding.primaryColor ?? '#000' }}
              />
              <h3 className="mb-2 text-center text-sm font-semibold">
                {LANDING_PAGE_TEXT.ratingTitle}
              </h3>
              <p className="mb-6 text-center text-xs text-muted-foreground">
                {LANDING_PAGE_TEXT.ratingSubtitle}
              </p>
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
              <p className="text-center text-[10px] text-muted-foreground">
                {LANDING_PAGE_TEXT.ratingFooter}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
