import { ExternalLink } from 'lucide-react';
import { GDPR_TEXT } from '@easyrate/shared';

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  privacyPolicyUrl?: string | undefined;
  disabled?: boolean;
  error?: boolean;
}

export function ConsentCheckbox({
  checked,
  onChange,
  privacyPolicyUrl,
  disabled = false,
  error = false,
}: ConsentCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          id="consent-checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={`
            h-5 w-5 rounded border-2 appearance-none cursor-pointer
            transition-colors duration-200
            ${error && !checked
              ? 'border-destructive bg-destructive/10'
              : checked
                ? 'border-primary bg-primary'
                : 'border-muted-foreground/50 bg-background hover:border-primary'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-primary/20
          `}
          aria-describedby="consent-description"
        />
        {/* Checkmark */}
        {checked && (
          <svg
            className="absolute inset-0 w-5 h-5 pointer-events-none"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 10L9 13L14 7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div className="flex-1">
        <label
          htmlFor="consent-checkbox"
          className={`
            text-sm cursor-pointer select-none
            ${error && !checked ? 'text-destructive' : 'text-foreground'}
          `}
          id="consent-description"
        >
          {GDPR_TEXT.consentLabel}
          {privacyPolicyUrl && (
            <>
              {' '}
              <a
                href={privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {GDPR_TEXT.privacyPolicyLink}
                <ExternalLink className="w-3 h-3" />
              </a>
            </>
          )}
        </label>
      </div>
    </div>
  );
}
