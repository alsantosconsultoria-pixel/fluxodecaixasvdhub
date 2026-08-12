import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FluxoProvider } from "@/lib/fluxo-store";
import { SessionProvider, useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { registrarLog } from "@/lib/logs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fluxo de Caixa | Painel Financeiro" },
      {
        name: "description",
        content:
          "Painel financeiro completo com fluxo de caixa, projeções futuras, DRE gerencial, KPIs e controle de acesso por usuário.",
      },
      { property: "og:title", content: "Fluxo de Caixa | Painel Financeiro" },
      {
        property: "og:description",
        content:
          "Painel financeiro completo com fluxo de caixa, projeções futuras, DRE gerencial, KPIs e controle de acesso por usuário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SairButton() {
  const { user, perfil } = useSession();
  if (!user) return null;
  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {perfil?.nome || user.email}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await registrarLog("logout", "Saída do painel");
          await supabase.auth.signOut();
          window.location.href = "/auth";
        }}
      >
        <LogOut className="size-3.5" />
        Sair
      </Button>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <FluxoProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full bg-gradient-page">
              <AppSidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-12 items-center gap-2 border-b border-flow-grid bg-card/70 px-2 backdrop-blur">
                  <SidebarTrigger />
                  <span className="text-sm font-medium text-foreground">Painel Financeiro</span>
                  <SairButton />
                </header>
                <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 md:px-8">
                  {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                  <Outlet />
                </main>
                <footer className="border-t border-flow-grid bg-card/70 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur">
                  Desenvolvido por Anderson Santos.
                </footer>
              </div>
            </div>
          </SidebarProvider>
        </FluxoProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
