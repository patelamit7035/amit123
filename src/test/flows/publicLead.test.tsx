import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { queryClient } from "@/App";
import { getBackend, resetDemoData } from "@/lib/data";

/** Renders the real app at a hash route, exactly as a visitor would open it. */
async function renderAt(path: string) {
  window.location.hash = path;
  const view = render(<App />);
  return view;
}

beforeEach(() => {
  queryClient.clear();
  resetDemoData();
});

describe("the public referral link", () => {
  it("shows the offer behind the link and records the click", async () => {
    await renderAt("#/r/RH7K2M4P");

    expect(await screen.findByText("FunnelOS Pro (Annual)")).toBeInTheDocument();
    expect(screen.getByText(/Recommended by Rahul Sharma/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get instant access/i })).toBeInTheDocument();

    await waitFor(async () => {
      const links = await getBackend().listLinks();
      expect(links.find((link) => link.code === "RH7K2M4P")?.clicks).toBe(149);
    });
  });

  it("captures a lead and attributes it to the affiliate who owns the link", async () => {
    const user = userEvent.setup();
    await renderAt("#/r/RH7K2M4P");
    await screen.findByText("FunnelOS Pro (Annual)");

    await user.type(screen.getByLabelText(/full name/i), "Meera Joshi");
    await user.type(screen.getByLabelText(/email/i), "meera.joshi@example.com");
    await user.type(screen.getByLabelText(/whatsapp number/i), "+91 98111 22333");
    await user.click(screen.getByRole("button", { name: /get instant access/i }));

    expect(await screen.findByText(/you are on the list/i)).toBeInTheDocument();

    const leads = await getBackend().listLeads();
    const lead = leads.find((row) => row.email === "meera.joshi@example.com");
    expect(lead).toBeDefined();
    expect(lead).toMatchObject({
      name: "Meera Joshi",
      phone: "+91 98111 22333",
      affiliateId: "usr_demo_rahul",
      productId: "prd_demo_os",
      status: "new",
      source: "referral-page",
    });

    // The lead gets a welcome email and the admin gets a notification.
    const log = await getBackend().listEmailLog();
    const forLead = log.filter((entry) => entry.leadId === lead?.id);
    expect(forLead.map((entry) => entry.template).sort()).toEqual(["lead-notification", "lead-welcome"]);
    expect(forLead.every((entry) => entry.status === "sent")).toBe(true);
    expect(forLead.some((entry) => entry.toEmail === "meera.joshi@example.com")).toBe(true);
  });

  it("rejects an incomplete form before anything is stored", async () => {
    const user = userEvent.setup();
    await renderAt("#/r/RH7K2M4P");
    await screen.findByText("FunnelOS Pro (Annual)");

    await user.type(screen.getByLabelText(/full name/i), "X");
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /get instant access/i }));

    expect(await screen.findByText(/enter your full name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();

    const leads = await getBackend().listLeads();
    expect(leads.some((row) => row.email === "not-an-email")).toBe(false);
  });

  it("tells the visitor when a link is no longer live", async () => {
    await renderAt("#/r/DEADLINK");
    expect(await screen.findByText(/this link is not active/i)).toBeInTheDocument();
  });

  it("serves the same form bare for embedding on another site", async () => {
    await renderAt("#/embed/RH7K2M4P");
    expect(await screen.findByRole("button", { name: /send me the details/i })).toBeInTheDocument();
    // No page chrome inside the iframe.
    expect(screen.queryByText(/Recommended by/i)).not.toBeInTheDocument();
  });
});
