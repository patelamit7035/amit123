import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PortalLayout } from "@/components/layout/PortalLayout";

import Home from "./pages/site/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ReferralLanding from "./pages/public/ReferralLanding";
import EmbedForm from "./pages/public/EmbedForm";

import AffiliateDashboard from "./pages/affiliate/Dashboard";
import AffiliateProducts from "./pages/affiliate/Products";
import AffiliateLeads from "./pages/affiliate/Leads";
import AffiliateEarnings from "./pages/affiliate/Earnings";
import AffiliateProfile from "./pages/affiliate/Profile";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminAffiliates from "./pages/admin/Affiliates";
import AdminLeads from "./pages/admin/Leads";
import AdminPayouts from "./pages/admin/Payouts";
import AdminSettings from "./pages/admin/Settings";

// The earlier Meta Ads dashboard in this repo, kept reachable under /adpilot.
import { AppLayout } from "@/components/layout/AppLayout";
import Overview from "./pages/dashboard/Overview";
import Campaigns from "./pages/dashboard/Campaigns";
import Creatives from "./pages/dashboard/Creatives";
import AgentActivity from "./pages/dashboard/AgentActivity";
import Analytics from "./pages/dashboard/Analytics";
import AdPilotSettings from "./pages/dashboard/Settings";

import NotFound from "./pages/NotFound";

// Exported so the integration tests can reset the cache between runs.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 15_000, retry: 1 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/r/:code" element={<ReferralLanding />} />
            <Route path="/embed/:code" element={<EmbedForm />} />

            {/* Affiliate portal (admins see the admin section too) */}
            <Route
              element={
                <RequireAuth>
                  <PortalLayout />
                </RequireAuth>
              }
            >
              <Route path="/app" element={<AffiliateDashboard />} />
              <Route path="/app/products" element={<AffiliateProducts />} />
              <Route path="/app/leads" element={<AffiliateLeads />} />
              <Route path="/app/earnings" element={<AffiliateEarnings />} />
              <Route path="/app/profile" element={<AffiliateProfile />} />
            </Route>

            {/* Admin panel */}
            <Route
              element={
                <RequireAuth adminOnly>
                  <PortalLayout />
                </RequireAuth>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/affiliates" element={<AdminAffiliates />} />
              <Route path="/admin/leads" element={<AdminLeads />} />
              <Route path="/admin/payouts" element={<AdminPayouts />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Previous project in this repo */}
            <Route path="/adpilot" element={<AppLayout />}>
              <Route index element={<Overview />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="creatives" element={<Creatives />} />
              <Route path="agent" element={<AgentActivity />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<AdPilotSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
