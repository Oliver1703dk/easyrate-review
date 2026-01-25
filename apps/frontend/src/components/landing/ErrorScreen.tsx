import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@easyrate/ui';
import { ERROR_MESSAGES } from '@easyrate/shared';

interface ErrorScreenProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>

      <h1 className="text-xl font-semibold text-foreground mb-2">{ERROR_MESSAGES.generic}</h1>

      <p className="text-muted-foreground mb-6 max-w-xs">{error}</p>

      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Prøv igen
        </Button>
      )}
    </div>
  );
}
