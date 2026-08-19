import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { scrollToDashboardSection } from "@/lib/dashboardNavigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";
import {
  Clapperboard,
  FlaskConical,
  Layers3,
  LibraryBig,
  LogOut,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  {
    id: "daily-research",
    label: "Daily research",
    icon: FlaskConical,
    kicker: "Queue",
  },
  {
    id: "draft-reels",
    label: "Draft reels",
    icon: Clapperboard,
    kicker: "Production",
  },
  {
    id: "weekly-compilation",
    label: "Weekly compilation",
    icon: Layers3,
    kicker: "Bundle",
  },
  {
    id: "publishing-status",
    label: "Publishing status",
    icon: Send,
    kicker: "Gate",
  },
  {
    id: "content-log",
    label: "Content log",
    icon: LibraryBig,
    kicker: "Archive",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [active, setActive] = useState("daily-research");

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0c12] text-[#f5f5f1] grid place-items-center p-6">
        <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#121621] p-9 shadow-2xl">
          <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b8ff70] text-[#0a0c12]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b8ff70]">
            Private workspace
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight">
            Sign in to your content desk.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#aab0bf]">
            NeuroPulse is an owner-controlled workspace for evidence-led content
            production and deliberate publishing approval.
          </p>
          <Button
            onClick={() => startLogin()}
            className="mt-8 w-full bg-[#b8ff70] text-[#11140d] hover:bg-[#c9ff91]"
          >
            Sign in securely
          </Button>
        </section>
      </main>
    );
  }

  const selectSection = (id: string) => {
    setActive(id);
    scrollToDashboardSection(id);
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        collapsible="icon"
        className="border-r border-white/8 bg-[#0a0c12] text-[#f5f5f1]"
      >
        <SidebarHeader className="h-24 px-4 pt-5">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#b8ff70] text-[#0a0c12] shadow-[0_0_0_4px_rgba(184,255,112,0.08)]">
              <span className="font-serif text-lg font-bold">N</span>
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="font-serif text-base font-semibold tracking-tight">
                NeuroPulse
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7e879a]">
                Content studio
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#626a7a] group-data-[collapsible=icon]:hidden">
            Operations
          </p>
          <SidebarMenu className="gap-1">
            {navigation.map(item => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active === item.id}
                    tooltip={item.label}
                    onClick={() => selectSection(item.id)}
                    className="h-auto rounded-xl px-3 py-2.5 text-[#aab0bf] data-[active=true]:bg-[#1b2130] data-[active=true]:text-[#f6f8f1]"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#b8ff70]" />
                    <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                      <span className="block text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-[#727b8e]">
                        {item.kicker}
                      </span>
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="rounded-2xl border border-white/8 bg-[#111620] p-2 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                <AvatarFallback className="bg-[#22293a] text-xs font-semibold text-[#dce2ea]">
                  {user.name?.slice(0, 1).toUpperCase() || "O"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-xs font-medium text-[#e9ebef]">
                  {user.name || "Workspace owner"}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-[#7e879a]">
                  Owner access
                </p>
              </div>
              <button
                onClick={logout}
                className="rounded-md p-1.5 text-[#7e879a] transition-colors hover:bg-white/5 hover:text-white group-data-[collapsible=icon]:hidden"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f4f4ef] text-[#171a22]">
        <div className="flex h-14 items-center border-b border-[#dfe1dc] bg-[#f4f4ef]/95 px-4 backdrop-blur md:hidden">
          <SidebarTrigger className="mr-3" />
          <span className="font-serif text-lg font-semibold">NeuroPulse</span>
        </div>
        <main className="min-h-screen">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
