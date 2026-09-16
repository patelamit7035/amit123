import { describe, expect, it } from "vitest";
import { escapeCsvValue, toCsv } from "./csv";

describe("CSV export", () => {
  it("quotes values containing commas, quotes and newlines", () => {
    expect(escapeCsvValue("plain")).toBe("plain");
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
    expect(escapeCsvValue(0)).toBe("0");
  });

  it("neutralises spreadsheet formula injection from lead fields", () => {
    expect(escapeCsvValue("=1+1")).toBe("'=1+1");
    expect(escapeCsvValue("+91999")).toBe("'+91999");
    expect(escapeCsvValue("@handle")).toBe("'@handle");
    expect(escapeCsvValue("-5")).toBe("'-5");
  });

  it("writes a header row and CRLF-separated records", () => {
    const csv = toCsv(
      [
        { name: "Arjun", email: "a@example.com" },
        { name: "Sneha, R", email: "s@example.com" },
      ],
      [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
      ],
    );
    expect(csv).toBe('Name,Email\r\nArjun,a@example.com\r\n"Sneha, R",s@example.com');
  });

  it("writes just the header when there are no rows", () => {
    expect(toCsv([], [{ key: "name", label: "Name" }])).toBe("Name");
  });
});
