/**
 * Wallet Management API Client
 * Hook untuk menggunakan fitur edit wallet dan members
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const configuredApiUrl = String(import.meta.env.VITE_API_URL ?? "http://localhost:4000").trim().replace(/\/+$/, "");
const API_BASE = configuredApiUrl.endsWith("/api/social")
  ? configuredApiUrl
  : configuredApiUrl.endsWith("/api")
  ? `${configuredApiUrl}/social`
  : `${configuredApiUrl}/api/social`;

/**
 * Update wallet details
 */
export function useUpdateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      walletId,
      data
    }: {
      walletId: string;
      data: {
        name?: string;
        description?: string;
        spendingLimit?: number | string;
        requireApproval?: boolean;
        storageAccountId?: string | null;
        storageType?: "cash" | "bank" | "e_wallet" | "gold" | "other";
        storageProvider?: string;
        storageAccountNumber?: string;
      };
    }) => {
      const response = await fetch(`${API_BASE}/wallets/${walletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", walletId] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    }
  });
}

/**
 * Update wallet member role or status
 */
export function useUpdateWalletMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      walletId,
      targetUserId,
      data
    }: {
      walletId: string;
      targetUserId: string;
      data: {
        role?: "admin" | "member" | "viewer";
        status?: "accepted" | "rejected" | "pending";
      };
    }) => {
      const response = await fetch(
        `${API_BASE}/wallets/${walletId}/members/${targetUserId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data)
        }
      );
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", walletId] });
    }
  });
}

/**
 * Remove member from wallet
 */
export function useRemoveWalletMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      walletId,
      targetUserId
    }: {
      walletId: string;
      targetUserId: string;
    }) => {
      const response = await fetch(
        `${API_BASE}/wallets/${walletId}/members/${targetUserId}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", walletId] });
    }
  });
}

/**
 * Get gold price history
 */
export function useGoldPrices(limit = 30) {
  return useQuery({
    queryKey: ["goldPrices", limit],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/gold-prices?limit=${limit}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }
  });
}

/**
 * Get current gold price
 */
export function useCurrentGoldPrice() {
  return useQuery({
    queryKey: ["goldPrice", "current"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/gold-prices/current`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }
  });
}

/**
 * Calculate rupiah from gold grams
 */
export function useGoldValue(grams: number | null) {
  const { data } = useCurrentGoldPrice();

  if (!grams || !data?.pricePerGram) return null;
  return Math.round(grams * data.pricePerGram);
}

/**
 * Calculate grams from rupiah
 */
export function useGoldWeight(rupiah: number | null) {
  const { data } = useCurrentGoldPrice();

  if (!rupiah || !data?.pricePerGram) return null;
  return Math.round((rupiah / data.pricePerGram) * 10000) / 10000; // Round to 4 decimals
}
