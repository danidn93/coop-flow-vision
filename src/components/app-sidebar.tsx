import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, Users, MapPin, Settings, FileText, Bus, 
  Calendar, Clock, LogOut, UserCheck 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Usuarios", url: "/usuarios", icon: Users },
  { title: "Buses", url: "/buses", icon: Bus },
  { title: "Rutas", url: "/rutas", icon: MapPin },
  { title: "Reportes", url: "/reportes", icon: FileText },
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, userRole, signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === "collapsed";

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      administrator: 'Administrador',
      president: 'Presidente',
      manager: 'Manager',
      employee: 'Empleado',
      partner: 'Socio',
      driver: 'Conductor',
      official: 'Dirigente',
      client: 'Cliente'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border/50 p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-primary">CTS</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm truncate">
                Cooperativa Mariscal Sucre
              </h2>
              <p className="text-xs text-muted-foreground">
                Sistema de Gestión
              </p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary">C</span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Menú Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={isActive(item.url) ? "bg-primary text-primary-foreground" : ""}
                  >
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2">
        {profile && !isCollapsed && (
          <div className="mb-3 p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium truncate">
                {profile.first_name} {profile.surname_1}
              </span>
            </div>
            {userRole && (
              <Badge variant="secondary" className="text-xs">
                {getRoleDisplayName(userRole.role)}
              </Badge>
            )}
          </div>
        )}
        
        <SidebarMenuButton asChild className="w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="justify-start"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </Button>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}