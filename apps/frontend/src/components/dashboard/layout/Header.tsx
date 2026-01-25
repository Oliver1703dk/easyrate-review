import { Avatar, AvatarFallback, AvatarImage } from '@easyrate/ui';
import { useAuth } from '../../../contexts/AuthContext';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, business } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Business name */}
        <span className="text-sm text-muted-foreground">{business?.name}</span>

        {/* User avatar */}
        <Avatar className="h-8 w-8">
          <AvatarImage src={undefined} alt={user?.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
