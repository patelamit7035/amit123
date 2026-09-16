import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee,
  Banknote,
  LayoutDashboard,
  LinkIcon,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSettings } from "@/hooks/useAffiliate";
import { isDemoMode } from "@/lib/data";

const AFFILIATE_NAV = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Products & links", url: "/app/products", icon: LinkIcon },
  { title: "My leads", url: "/app/leads", icon: Users },
  { title: "Earnings", url: "/app/earnings", icon: Wallet },
  { title: "Payout details", url: "/app/profile", icon: Banknote },
];

const ADMIN_NAV = [
  { title: "Admin overview", url: "/admin", icon: ShieldCheck, end: true },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Affiliates", url: "/admin/affiliates", icon: Users },
  { title: "All leads", url: "/admin/leads", icon: LayoutDashboard },
  { title: "Payouts", url: "/admin/payouts", icon: BadgeIndianRupee },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function PortalLayout() {
  const { profile, isAdmin, signOut } = useAuth();
  const { data: settings } = useSettings();
  const navigate = useNavigate();
  const brand = settings?.brandName || "FunnelOS";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link to="/app" className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">{brand}</span>
              <span className="text-[11px] text-muted-foreground">Affiliate program</span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>My account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {AFFILIATE_NAV.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.end}
                        className={({ isActive }) => (isActive ? "bg-sidebar-accent font-medium" : "")}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {isAdmin ? (
            <SidebarGroup>
              <SidebarGroupLabel>Admin panel</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_NAV.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.end}
                          className={({ isActive }) => (isActive ? "bg-sidebar-accent font-medium" : "")}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>

        <SidebarFooter>
          <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">{profile?.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {isDemoMode ? (
            <Badge variant="outline" className="hidden sm:inline-flex">
              Demo mode - data stays in this browser
            </Badge>
          ) : null}
          <div className="flex-1" />
          {profile?.referralCode ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Referral code <span className="font-mono font-medium text-foreground">{profile.referralCode}</span>
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign out
          </Button>
        </header>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
