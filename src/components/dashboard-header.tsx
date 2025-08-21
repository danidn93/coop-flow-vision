import { useState, useEffect } from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Clock, Calendar } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function DashboardHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
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
      </div>
    </header>
  );
}