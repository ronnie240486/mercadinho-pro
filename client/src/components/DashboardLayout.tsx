import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/contexts/ThemeContext";
import { BrandIcon } from "./BrandIcon";
import {
  Boxes,
  Truck,
  ClipboardCheck,
  ChartNoAxesCombined,
  BadgePercent,
  BellRing,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Moon,
  PackageSearch,
  PackagePlus,
  PanelLeft,
  ShoppingCart,
  Sun,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: ShoppingCart, label: "Frente de caixa", path: "/pdv" },
  { icon: PackageSearch, label: "Produtos", path: "/produtos" },
  { icon: Boxes, label: "Estoque", path: "/estoque" },
  { icon: Truck, label: "Compras", path: "/compras" },
  { icon: ClipboardCheck, label: "Inventário", path: "/inventario" },
  { icon: BadgePercent, label: "Preços e promoções", path: "/precos" },
  { icon: CalendarClock, label: "Validade e perdas", path: "/validade" },
  { icon: WalletCards, label: "Caixa", path: "/caixa" },
  { icon: WalletCards, label: "Contas a pagar", path: "/contas-a-pagar" },
  { icon: BellRing, label: "Alertas", path: "/alertas" },
  { icon: PackagePlus, label: "Ferramentas", path: "/ferramentas" },
  { icon: UsersRound, label: "Cadastros", path: "/cadastros" },
  { icon: ChartNoAxesCombined, label: "Relatórios", path: "/relatorios" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 282;
const MIN_WIDTH = 230;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? Number.parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f6f1] px-5">
        <button onClick={toggleTheme} className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe5df] bg-white text-[#164e3d] shadow-sm transition-colors hover:bg-[#edf5ee]" aria-label={theme === "dark" ? "Usar modo claro" : "Usar modo escuro"}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        <div className="absolute -left-28 top-[-90px] h-72 w-72 rounded-full bg-emerald-200/45 blur-3xl" />
        <div className="absolute -bottom-28 right-[-80px] h-80 w-80 rounded-full bg-amber-100 blur-3xl" />
        <section className="relative w-full max-w-md rounded-[28px] border border-white/80 bg-white/85 p-8 text-center shadow-[0_24px_80px_rgba(23,52,45,0.13)] backdrop-blur sm:p-10">
          <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#164e3d] text-[#d8f0df] shadow-lg shadow-emerald-900/15"><BrandIcon className="h-10 w-10" /></div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.19em] text-emerald-800">Mercadinho Pro</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#17332c]">Sua operação em um só lugar.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Entre para acompanhar vendas, estoque, caixa e toda a rotina do seu mercadinho.
          </p>
          <Button onClick={() => startLogin()} size="lg" className="mt-8 h-12 w-full rounded-xl bg-[#164e3d] text-white hover:bg-[#0f4032]">
            Acessar sistema
          </Button>
          <p className="mt-4 text-xs text-slate-500">O acesso é protegido por conta e permissões de operação.</p>
        </section>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location) ?? menuItems[0];
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const displayRole = user?.role === "admin" ? "Administrador" : user?.role === "manager" ? "Gerente" : user?.role === "stockist" ? "Estoquista" : "Operador";

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0 bg-[#123e32] text-emerald-50" disableTransition={isResizing}>
          <SidebarHeader className="h-[76px] justify-center border-b border-white/10 px-3">
            <div className="flex w-full items-center gap-3 px-1">
              <button
                onClick={toggleSidebar}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-emerald-100 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                aria-label="Alternar navegação"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed && (
                <button className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => setLocation("/")}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d8f0df] text-[#164e3d]"><BrandIcon className="h-7 w-7" /></span>
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-base font-semibold tracking-tight">Mercadinho Pro</span>
                    <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/75">Gestão comercial</span>
                  </span>
                </button>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-5">
            {!isCollapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/45">Operação</p>}
            <SidebarMenu className="gap-1">
              {menuItems.map(item => {
                const isActive = item.path === location;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-11 rounded-xl px-3 text-emerald-50/75 transition-all hover:bg-white/10 hover:text-white data-[active=true]:bg-[#d8f0df] data-[active=true]:font-semibold data-[active=true]:text-[#164e3d]"
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-white/10 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 shrink-0 border border-white/15 bg-emerald-50 text-[#164e3d]">
                    <AvatarFallback className="bg-[#d8f0df] text-xs font-bold text-[#164e3d]">{user?.name?.slice(0, 1).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <span className="block truncate text-sm font-semibold text-white">{user?.name || "Usuário"}</span>
                    <span className="mt-0.5 block truncate text-xs text-emerald-100/60">{displayRole}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer rounded-lg"><span className="mr-2">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</span>{theme === "dark" ? "Usar modo claro" : "Usar modo escuro"}</DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Encerrar sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-emerald-300/30 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => !isCollapsed && setIsResizing(true)}
        />
      </div>

      <SidebarInset className="min-w-0 bg-[#f6f6f1]">
        {isMobile && (
          <div className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[#dfe5df] bg-[#f6f6f1]/95 px-4 backdrop-blur">
            <SidebarTrigger className="h-9 w-9 rounded-xl bg-white shadow-sm" />
            <span className="font-serif text-lg font-semibold text-[#17332c]">{activeMenuItem.label}</span>
          </div>
        )}
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
