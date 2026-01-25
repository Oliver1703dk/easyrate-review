import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface BrandingSectionProps {
  primaryColor: string;
  logoUrl: string;
  onPrimaryColorChange: (value: string) => void;
  onLogoUrlChange: (value: string) => void;
}

export function BrandingSection({
  primaryColor,
  logoUrl,
  onPrimaryColorChange,
  onLogoUrlChange,
}: BrandingSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD_TEXT.settings.branding.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="primaryColor">{DASHBOARD_TEXT.settings.branding.primaryColor}</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl">{DASHBOARD_TEXT.settings.branding.logoUrl}</Label>
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => onLogoUrlChange(e.target.value)}
              placeholder={DASHBOARD_TEXT.settings.branding.logoUrlPlaceholder}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>{DASHBOARD_TEXT.settings.branding.preview}</Label>
          <div
            className="flex h-32 items-center justify-center rounded-lg border"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-20 max-w-40 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                E
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
