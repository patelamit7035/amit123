import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { queryClient } from "@/App";
import { getBackend, resetDemoData } from "@/lib/data";
import { LocalBackend } from "@/lib/data/local/localBackend";
import { memoryStorage } from "@/lib/data/local/localDb";

function renderAt(path: string) {
  window.location.hash = path;
  return render(<App />);
}

const FILLED = {
  "full name": "Priya Nair",
  email: "priya.nair@example.com",
  "phone (whatsapp)": "+91 91234 56780",
  "account holder name": "Priya Nair",
  "bank name": "ICICI Bank",
  "account number": "002401512345",
  "ifsc code": "ICIC0000024",
};

async function fillRegistration(user: ReturnType<typeof userEvent.setup>) {
  for (const [label, value] of Object.entries(FILLED)) {
    const pattern = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await user.type(screen.getByLabelText(new RegExp(`^${pattern}$`, "i")), value);
  }
  await user.type(screen.getByLabelText(/^password$/i), "affiliate123");
  await user.type(screen.getByLabelText(/confirm password/i), "affiliate123");
}

beforeEach(async () => {
  queryClient.clear();
  resetDemoData();
  await getBackend().signOut();
});

describe("registering as an affiliate", () => {
  it("captures the bank details and opens the dashboard", async () => {
    const user = userEvent.setup();
    renderAt("#/register");
    await screen.findByRole("heading", { name: /join the affiliate program/i });

    await fillRegistration(user);
    await user.click(screen.getByRole("button", { name: /create my affiliate account/i }));

    expect(await screen.findByRole("heading", { name: /welcome back, priya/i })).toBeInTheDocument();

    const profile = await getBackend().getCurrentProfile();
    expect(profile).toMatchObject({ email: "priya.nair@example.com", role: "affiliate", status: "active" });
    expect(profile?.referralCode).toMatch(/^PRIYAN-[A-Z2-9]{4}$/);

    const bank = await getBackend().getBankDetails(profile?.id as string);
    expect(bank).toMatchObject({
      accountHolderName: "Priya Nair",
      bankName: "ICICI Bank",
      accountNumber: "002401512345",
      ifscCode: "ICIC0000024",
    });
  });

  it("rejects a bad IFSC, a short password and a mismatched confirmation", async () => {
    const user = userEvent.setup();
    renderAt("#/register");
    await screen.findByRole("heading", { name: /join the affiliate program/i });

    await user.type(screen.getByLabelText(/^full name$/i), "Priya Nair");
    await user.type(screen.getByLabelText(/^email$/i), "priya.nair@example.com");
    await user.type(screen.getByLabelText(/^phone \(whatsapp\)$/i), "+91 91234 56780");
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "different");
    await user.type(screen.getByLabelText(/^account holder name$/i), "Priya Nair");
    await user.type(screen.getByLabelText(/^bank name$/i), "ICICI Bank");
    await user.type(screen.getByLabelText(/^account number$/i), "002401512345");
    await user.type(screen.getByLabelText(/^ifsc code$/i), "NOTANIFSC");
    await user.click(screen.getByRole("button", { name: /create my affiliate account/i }));

    expect(await screen.findByText(/use at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid ifsc code/i)).toBeInTheDocument();

    expect(await getBackend().getCurrentProfile()).toBeNull();
  });

  it("refuses an email that is already registered", async () => {
    const user = userEvent.setup();
    renderAt("#/register");
    await screen.findByRole("heading", { name: /join the affiliate program/i });

    await user.clear(screen.getByLabelText(/^email$/i));
    await fillRegistration(user);
    await user.clear(screen.getByLabelText(/^email$/i));
    await user.type(screen.getByLabelText(/^email$/i), "rahul@funnelos.app");
    await user.click(screen.getByRole("button", { name: /create my affiliate account/i }));

    expect(await screen.findByText(/an account with this email already exists/i)).toBeInTheDocument();
  });
});

describe("the very first account", () => {
  it("becomes the admin so a fresh deployment is never locked out", async () => {
    const backend = new LocalBackend({ storage: memoryStorage(), seed: false });
    const first = await backend.signUp({
      fullName: "Amit Patel",
      email: "owner@example.com",
      phone: "+91 90000 00000",
      password: "supersecret1",
      confirmPassword: "supersecret1",
      accountHolderName: "Amit Patel",
      bankName: "HDFC Bank",
      accountNumber: "50100234567890",
      ifscCode: "HDFC0001234",
      upiId: "",
    });
    expect(first?.role).toBe("admin");
  });
});
