import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Button, Spinner } from '@easyrate/ui';
import { DASHBOARD_TEXT, SMS_TEMPLATES, EMAIL_TEMPLATES } from '@easyrate/shared';
import { Header } from '../../components/dashboard/layout';
import {
  ProfileSection,
  MessageTemplatesSection,
  BrandingSection,
  GoogleReviewSection,
} from '../../components/dashboard/settings';
import { useBusinessSettings } from '../../hooks';

export function SettingsPage() {
  const { business, isLoading, isSaving, updateSettings } = useBusinessSettings();
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [smsTemplate, setSmsTemplate] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [logoUrl, setLogoUrl] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');

  // Initialize form state from business data
  useEffect(() => {
    if (business) {
      setName(business.name || '');
      setEmail(business.email || '');
      setPhone(business.phone || '');
      setAddress(business.address || '');
      setSmsTemplate(business.messageTemplates?.sms || SMS_TEMPLATES.reviewRequest);
      setEmailTemplate(business.messageTemplates?.email || EMAIL_TEMPLATES.reviewRequest.body);
      setPrimaryColor(business.branding?.primaryColor || '#000000');
      setLogoUrl(business.branding?.logoUrl || '');
      setGoogleReviewUrl(business.settings?.googleReviewUrl || '');
    }
  }, [business]);

  const handleSave = async () => {
    try {
      await updateSettings({
        name,
        email,
        phone,
        address,
        messageTemplates: {
          sms: smsTemplate,
          email: emailTemplate,
        },
        branding: {
          primaryColor,
          logoUrl,
        },
        settings: {
          googleReviewUrl,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title={DASHBOARD_TEXT.settings.title} />

      <div className="p-6">
        <div className="space-y-6">
          <ProfileSection
            name={name}
            email={email}
            phone={phone}
            address={address}
            onNameChange={setName}
            onEmailChange={setEmail}
            onPhoneChange={setPhone}
            onAddressChange={setAddress}
          />

          <MessageTemplatesSection
            smsTemplate={smsTemplate}
            emailTemplate={emailTemplate}
            onSmsTemplateChange={setSmsTemplate}
            onEmailTemplateChange={setEmailTemplate}
          />

          <BrandingSection
            primaryColor={primaryColor}
            logoUrl={logoUrl}
            onPrimaryColorChange={setPrimaryColor}
            onLogoUrlChange={setLogoUrl}
          />

          <GoogleReviewSection
            googleReviewUrl={googleReviewUrl}
            onGoogleReviewUrlChange={setGoogleReviewUrl}
          />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {DASHBOARD_TEXT.settings.saving}
                </>
              ) : saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {DASHBOARD_TEXT.settings.saved}
                </>
              ) : (
                DASHBOARD_TEXT.settings.save
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
