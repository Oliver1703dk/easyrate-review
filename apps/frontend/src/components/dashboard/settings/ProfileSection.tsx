import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@easyrate/ui';
import { DASHBOARD_TEXT } from '@easyrate/shared';

interface ProfileSectionProps {
  name: string;
  email: string;
  phone: string;
  address: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
}

export function ProfileSection({
  name,
  email,
  phone,
  address,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onAddressChange,
}: ProfileSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{DASHBOARD_TEXT.settings.profile.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">{DASHBOARD_TEXT.settings.profile.businessName}</Label>
            <Input
              id="businessName"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{DASHBOARD_TEXT.settings.profile.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{DASHBOARD_TEXT.settings.profile.phone}</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{DASHBOARD_TEXT.settings.profile.address}</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
