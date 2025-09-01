import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, User, Shield, Users, Crown, Briefcase, Car, Flag, UserCheck } from "lucide-react";

const getRoleIcon = (role: string) => {
  const icons = {
    administrator: Shield,
    president: Crown,
    manager: Briefcase,
    employee: User,
    partner: Users,
    driver: Car,
    official: Flag,
    client: UserCheck
  };
  const IconComponent = icons[role as keyof typeof icons] || User;
  return <IconComponent className="h-4 w-4" />;
};

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

const getRoleBadgeVariant = (role: string) => {
  const variants = {
    administrator: 'destructive' as const,
    president: 'default' as const,
    manager: 'default' as const,
    employee: 'secondary' as const,
    partner: 'default' as const,
    driver: 'secondary' as const,
    official: 'secondary' as const,
    client: 'outline' as const
  };
  return variants[role as keyof typeof variants] || 'outline';
};

export function RoleSwitcher() {
  const { userRoles, activeRole, switchRole } = useAuth();

  if (!userRoles || userRoles.length <= 1) {
    return (
      <Badge variant={getRoleBadgeVariant(activeRole || 'client')}>
        {getRoleIcon(activeRole || 'client')}
        <span className="ml-2">{getRoleDisplayName(activeRole || 'client')}</span>
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[160px]">
          <div className="flex items-center">
            {getRoleIcon(activeRole || 'client')}
            <span className="ml-2">{getRoleDisplayName(activeRole || 'client')}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">Cambiar Rol</div>
        <DropdownMenuSeparator />
        {userRoles.map((role) => (
          <DropdownMenuItem
            key={role.id}
            onClick={() => switchRole(role.role)}
            className={activeRole === role.role ? "bg-accent" : ""}
          >
            <div className="flex items-center w-full">
              {getRoleIcon(role.role)}
              <span className="ml-2 flex-1">{getRoleDisplayName(role.role)}</span>
              {activeRole === role.role && (
                <Badge variant="secondary" className="ml-2 text-xs">Activo</Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}