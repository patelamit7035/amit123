import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Sparkles,
  Activity,
  BarChart3,
  Settings,
  Bot,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useAgentStore } from "@/hooks/useAgentStore";

// This dashboard now lives under /adpilot; the affiliate system owns the root.
const NAV_ITEMS = [
  { title: "Overview", url: "/adpilot", icon: LayoutDashboard },
  { title: "Campaigns", url: "/adpilot/campaigns", icon: Megaphone },
  { title: "Creatives", url: "/adpilot/creatives", icon: Sparkles },
  { title: "Agent Activity", url: "/adpilot/agent", icon: Activity },
  { title: "Analytics", url: "/adpilot/analytics", icon: BarChart3 },
  { title: "Settings", url: "/adpilot/settings", icon: Settings },
];

export function AppSidebar() {
  const { campaigns, settings } = useAgentStore();
  const pendingCreatives = campaigns
    .flatMap((c) => c.adSets)
    .flatMap((a) => a.creatives)
    .filter((c) => c.status === "pending_review").length;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">AdPilot AI</span>
            <span className="text-[11px] text-muted-foreground">Meta Ads Agent</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/adpilot"}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.title === "Creatives" && pendingCreatives > 0 && (
                    <SidebarMenuBadge>{pendingCreatives}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-sidebar-border p-2 group-data-[collapsible=icon]:hidden">
          <div className="flex flex-col">
            <span className="text-xs font-medium">Meta account</span>
            <span className="text-[11px] text-muted-foreground">
              {settings.connected ? settings.adAccountId || "Connected" : "Not connected"}
            </span>
          </div>
          <Badge variant={settings.connected ? "default" : "secondary"} className="text-[10px]">
            {settings.connected ? "Live" : "Demo"}
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
