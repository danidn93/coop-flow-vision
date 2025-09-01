import { useState, useEffect } from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Clock, Calendar, UserPlus } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RoleSwitcher } from '@/components/role-switcher';
import { RoleRequestModal } from '@/components/role-request-modal';
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRoleRequestOpen, setIsRoleRequestOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center">
          <SidebarTrigger className="mr-6" />
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {format(currentTime, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium tabular-nums">
                {format(currentTime, 'HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRoleRequestOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Solicitar Roles
          </Button>
          <RoleSwitcher />
        </div>
        
        <RoleRequestModal 
          isOpen={isRoleRequestOpen} 
          onClose={() => setIsRoleRequestOpen(false)} 
        />
      </div>
    </header>
  );
}