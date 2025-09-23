"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "../components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Upload, MessageCircle, Settings, LogOut, User, ChevronDown } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { data: session, status } = useSession();
  
  const navItems = [
    {
      id: 'upload',
      label: 'File Upload',
      icon: Upload
    },
    {
      id: 'clients',
      label: 'Chat',
      icon: MessageCircle
    }
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (status === "loading") {
    return (
      <div className="w-64 h-full bg-sidebar border-r border-sidebar-border flex items-center justify-center">
        <div className="text-sidebar-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col" data-testid="navigation">
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-sidebar-foreground">Tool Dashboard</h2>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className={`w-full justify-start ${
                  activeTab === item.id 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Avatar className="w-6 h-6 mr-3">
                {session.user?.image && (
                  <AvatarImage src={session.user.image} alt={session.user.name || ''} />
                )}
                <AvatarFallback className="text-xs">
                  {session.user?.name ? getUserInitials(session.user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm">{session.user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{session.user?.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm">{session.user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{session.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} data-testid="signout-button">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}