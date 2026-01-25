import { Spinner } from '@easyrate/ui';

interface LoadingScreenProps {
  text?: string;
}

export function LoadingScreen({ text }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6">
      <Spinner size="xl" className="text-primary mb-4" />
      {text && <p className="text-muted-foreground">{text}</p>}
    </div>
  );
}
