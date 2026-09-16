import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { queryClient } from "@/App";
import { getBackend, resetDemoData } from "@/lib/data";
import { DEMO_ADMIN, DEMO_AFFILIATE } from "@/lib/data/local/seed";
import { payoutDueAt } from "@/lib/affiliate/commission";

function renderAt(path: string) {
  window.location.hash = path;
  return render(<App />);
}

/**
 * Moves the already-rendered app to another route.
 *
 * Tests navigate this way rather than clicking the sidebar: those buttons are
 * wrapped in Radix tooltips, whose hover handling deadlocks jsdom's synthetic
 * pointer events. In-page links are clicked normally (see below).
 */
function goTo(path: string) {
  window.location.hash = path;
}


/** Reads the number shown on a dashboard stat tile, by its label. */
async function statValue(label: RegExp): Promise<string> {
  const labelNode = await screen.findByText(label);
  const value = labelNode.parentElement?.querySelector("p:nth-of-type(2)");
  return (value?.textContent || "").trim();
}

async function signIn(email: string, password: string) {
  const user = userEvent.setup();
  renderAt("#/login");
  await user.type(await screen.findByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole("button", { name: /^sign in$/i }));
  return user;
}

beforeEach(async () => {
  queryClient.clear();
  resetDemoData();
  await getBackend().signOut();
});

describe("signing in", () => {
  it("refuses the wrong password", async () => {
    const user = userEvent.setup();
    renderAt("#/login");
    await user.type(await screen.findByLabelText(/email/i), DEMO_ADMIN.email);
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/email or password is incorrect/i)).toBeInTheDocument();
  });

  it("sends an admin to the admin panel", async () => {
    await signIn(DEMO_ADMIN.email, DEMO_ADMIN.password);
    expect(await screen.findByRole("heading", { name: /admin overview/i })).toBeInTheDocument();
    expect(screen.getByText(/leads by affiliate/i)).toBeInTheDocument();
  });

  it("sends an affiliate to their own dashboard, with no admin section", async () => {
    await signIn(DEMO_AFFILIATE.email, DEMO_AFFILIATE.password);
    expect(await screen.findByRole("heading", { name: /welcome back, rahul/i })).toBeInTheDocument();
    expect(screen.queryByText(/admin panel/i)).not.toBeInTheDocument();
  });

  it("keeps a signed-out visitor out of the dashboard", async () => {
    renderAt("#/app/leads");
    expect(await screen.findByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("keeps an affiliate out of the admin panel", async () => {
    await signIn(DEMO_AFFILIATE.email, DEMO_AFFILIATE.password);
    await screen.findByRole("heading", { name: /welcome back/i });

    window.location.hash = "#/admin/payouts";
    await waitFor(() => expect(screen.queryByRole("heading", { name: /payouts/i })).not.toBeInTheDocument());
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });
});

describe("the affiliate dashboard", () => {
  it("shows the affiliate's own leads, links and earnings", async () => {
    const user = await signIn(DEMO_AFFILIATE.email, DEMO_AFFILIATE.password);
    await screen.findByRole("heading", { name: /welcome back/i });

    // Rahul's seeded program: 244 clicks over two links, 6 leads, 3 sales.
    expect(await statValue(/link clicks/i)).toBe("244");
    expect(await statValue(/leads submitted/i)).toBe("6");
    expect(await statValue(/purchases/i)).toBe("3");

    goTo("#/app/leads");
    expect(await screen.findByRole("heading", { name: /my leads/i })).toBeInTheDocument();
    expect(screen.getByText("arjun.mehta@example.com")).toBeInTheDocument();
    // Priya's lead belongs to another affiliate and must not show up.
    expect(screen.queryByText("kavya.r@example.com")).not.toBeInTheDocument();
  });

  it("gives every product a copyable link and an embed snippet", async () => {
    const user = await signIn(DEMO_AFFILIATE.email, DEMO_AFFILIATE.password);
    await screen.findByRole("heading", { name: /welcome back/i });

    // An in-page link, clicked the way a person would.
    await user.click(screen.getByRole("link", { name: /get my links/i }));
    expect(await screen.findByRole("heading", { name: /products & your links/i })).toBeInTheDocument();

    const linkInputs = await screen.findAllByDisplayValue(/#\/r\/RH7K2M4P$/);
    expect(linkInputs.length).toBeGreaterThan(0);

    // A product the affiliate has no link for yet gets one created on sight.
    await waitFor(async () => {
      const links = await getBackend().listLinks("usr_demo_rahul");
      expect(links).toHaveLength(3);
    });

    await user.click((await screen.findAllByRole("button", { name: /embed the form/i }))[0]);
    expect(await screen.findByText(/put this form on your own page/i)).toBeInTheDocument();
    const snippet = screen.getByDisplayValue(/data-funnelos-ref="[A-Z2-9]{8}"/) as HTMLTextAreaElement;
    expect(snippet.value).toContain("/embed.js");
    expect(snippet.value).toContain("<div id=\"funnelos-form-");
  });
});

describe("the admin records a purchase", () => {
  it("turns a lead into a commission with the right amount and credit date", async () => {
    const user = await signIn(DEMO_ADMIN.email, DEMO_ADMIN.password);
    await screen.findByRole("heading", { name: /admin overview/i });

    goTo("#/admin/leads");
    expect(await screen.findByRole("heading", { name: /all leads/i })).toBeInTheDocument();

    const row = (await screen.findByText("rohit.v@example.com")).closest("tr") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: /mark purchased/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/7-day hold/i)).toBeInTheDocument();

    const amount = within(dialog).getByLabelText(/amount actually paid/i);
    await user.clear(amount);
    await user.type(amount, "4999");
    // 30% of 4999 - shown before anything is saved.
    expect(await within(dialog).findByText(/1,499.70/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /record purchase/i }));

    await waitFor(async () => {
      const conversions = await getBackend().listConversions("usr_demo_rahul");
      expect(conversions.some((row) => row.saleAmount === 4999 && row.commissionAmount === 1499.7)).toBe(true);
    });

    const created = (await getBackend().listConversions("usr_demo_rahul")).find((row) => row.saleAmount === 4999);
    expect(created?.payoutDueAt).toBe(payoutDueAt(created?.convertedAt as string, 7));
    expect(created?.paidAt).toBeNull();

    const lead = (await getBackend().listLeads()).find((row) => row.email === "rohit.v@example.com");
    expect(lead?.status).toBe("converted");
  });

  it("shows matured commissions on the payouts page with the affiliate's bank details", async () => {
    const user = await signIn(DEMO_ADMIN.email, DEMO_ADMIN.password);
    await screen.findByRole("heading", { name: /admin overview/i });

    goTo("#/admin/payouts");
    expect(await screen.findByRole("heading", { name: /^payouts$/i })).toBeInTheDocument();

    // The seeded sale from 8 days ago has cleared its 7-day hold. Rahul shows
    // up in both the "ready to transfer" and "still in hold" sections.
    expect((await screen.findAllByText("Rahul Sharma")).length).toBeGreaterThan(0);
    expect(screen.getByText("50100234567890")).toBeInTheDocument();
    expect(screen.getByText("HDFC0001234")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /mark as paid/i }).length).toBeGreaterThan(0);
  });

  it("records a transfer and moves the money to paid", async () => {
    const user = await signIn(DEMO_ADMIN.email, DEMO_ADMIN.password);
    await screen.findByRole("heading", { name: /admin overview/i });
    goTo("#/admin/payouts");
    await screen.findByRole("heading", { name: /^payouts$/i });

    await user.click((await screen.findAllByRole("button", { name: /mark as paid/i }))[0]);
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/transfer reference/i), "UPI/992211");
    await user.click(within(dialog).getByRole("button", { name: /mark as paid/i }));

    await waitFor(async () => {
      const payouts = await getBackend().listPayouts();
      expect(payouts.some((payout) => payout.reference === "UPI/992211")).toBe(true);
    });

    const payout = (await getBackend().listPayouts()).find((row) => row.reference === "UPI/992211");
    const conversions = await getBackend().listConversions();
    for (const id of payout?.conversionIds ?? []) {
      expect(conversions.find((row) => row.id === id)?.paidAt).toBeTruthy();
    }
  });

  it("will not let a commission be paid twice", async () => {
    const user = await signIn(DEMO_ADMIN.email, DEMO_ADMIN.password);
    await screen.findByRole("heading", { name: /admin overview/i });
    goTo("#/admin/payouts");
    await screen.findByRole("heading", { name: /^payouts$/i });

    const before = (await getBackend().listConversions()).filter((row) => row.paidAt).length;
    await user.click((await screen.findAllByRole("button", { name: /mark as paid/i }))[0]);
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/transfer reference/i), "UPI/000111");
    await user.click(within(dialog).getByRole("button", { name: /mark as paid/i }));

    await waitFor(async () => {
      expect((await getBackend().listConversions()).filter((row) => row.paidAt).length).toBe(before + 1);
    });

    // The same commission is gone from the "ready to transfer" list.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
