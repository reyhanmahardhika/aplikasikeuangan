import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("heic2any", () => ({
  default: vi.fn(async ({ blob }: { blob: Blob }) => blob)
}));

import App from "./App";

function createAccessToken(expOffsetSeconds = 3600) {
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ exp: Math.floor(Date.now() / 1000) + expOffsetSeconds })}.signature`;
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}

describe("App dashboard loading", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("finance-session", JSON.stringify({
      user: {
        id: "user-1",
        fullName: "Demo User",
        email: "demo@example.com",
        username: "demo-user"
      },
      accessToken: createAccessToken(),
      refreshToken: "refresh-token",
      lastActivityAt: Date.now()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("stops endless loading and recovers after retry when dashboard fetch fails on reload", async () => {
    let dashboardAttempts = 0;

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/notifications/language")) {
        return jsonResponse({ ok: true });
      }

      if (url.includes("/api/auth/refresh-token")) {
        return jsonResponse({
          user: {
            id: "user-1",
            fullName: "Demo User",
            email: "demo@example.com",
            username: "demo-user"
          },
          accessToken: createAccessToken(),
          refreshToken: "refresh-token"
        });
      }

      if (url.includes("/api/accounts")) return jsonResponse([]);
      if (url.includes("/api/categories")) return jsonResponse([]);
      if (url.includes("/api/schedules")) return jsonResponse([]);
      if (url.includes("/api/dashboard/summary")) {
        dashboardAttempts += 1;
        if (dashboardAttempts === 1) {
          return jsonResponse({ message: "Dashboard gagal dimuat" }, 500);
        }
        return jsonResponse({
          balance: "1500000",
          incomeThisMonth: "2500000",
          expenseThisMonth: "1000000",
          daily: [],
          expenseByCategory: [{ category: "Makan", total: "350000" }],
          lastTransactions: [],
          budgetAlerts: [],
          insight: {
            currentWeekExpense: "250000",
            previousWeekExpense: "200000",
            weekChangePercent: 25,
            scheduledUntilMonthEnd: "100000",
            availableUntilMonthEnd: "1400000"
          }
        });
      }

      throw new Error(`Unhandled request in test: ${init?.method ?? "GET"} ${url}`);
    }));

    render(<App />);

    expect(await screen.findByText("Data belum bisa dimuat.")).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard gagal dimuat").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    await waitFor(() => {
      expect(dashboardAttempts).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText("Data belum bisa dimuat.")).not.toBeInTheDocument();
      expect(screen.getAllByText("Makan").length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
