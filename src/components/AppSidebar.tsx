import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CalendarClock,
  FileBarChart,
  History,
  LayoutDashboard,
  Presentation,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useEmpresa } from "@/lib/empresa";
import { useSession } from "@/lib/session";

const financeiro = [
  { title: "Fluxo de Caixa", url: "/", icon: LayoutDashboard },
  { title: "Saldos Bancários", url: "/bancos", icon: Landmark },
  { title: "DRE Gerencial", url: "/dre", icon: FileBarChart },
  { title: "Projeções futuras", url: "/projecao", icon: CalendarClock },
  { title: "Apresentação", url: "/apresentacao", icon: Presentation },
];

const administracao = [
  { title: "Editar KPIs", url: "/kpis", icon: Wand2 },
  { title: "Usuários", url: "/usuarios", icon: Users },
  { title: "Empresa", url: "/empresa", icon: Building2 },
  { title: "Registros", url: "/logs", icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin } = useSession();
  const { empresa } = useEmpresa();


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            {empresa?.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={`Logo ${empresa.nome}`}
                className="size-full object-contain"
              />
            ) : (
              <Wallet className="size-4" />
            )}
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight">
              {empresa?.nome ?? "Painel Financeiro"}
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeiro.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {administracao.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={currentPath === item.url}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

    </Sidebar>
  );
}
