/* Generated from App.tsx. Review before commit. */

import type { View } from "./types/app";
import type { LucideIcon } from "lucide-react";
import { Bot, CircleDollarSign, Home, LayoutDashboard, LineChart, Plus, ReceiptText, Settings, Tags, Users, Wallet } from "lucide-react";
import type { View } from "../types/app";

export const navigation: Array<{
    id: View;
    label: string;
    icon: LucideIcon;
}> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "manual", label: "Tambah", icon: Plus },
    { id: "history", label: "Riwayat", icon: ReceiptText },
    { id: "accounts", label: "Akun", icon: Wallet },
    { id: "categories", label: "Kategori", icon: Tags },
    { id: "budgets", label: "Anggaran", icon: CircleDollarSign },
    { id: "reports", label: "Laporan", icon: LineChart },
    { id: "assistant", label: "Kopilot Keuangan", icon: Bot },
    { id: "social", label: "Sosial", icon: Users },
    { id: "profile", label: "Profil", icon: Settings }
];

export const mobileNavigation: Array<{
    id: View;
    label: string;
    icon: LucideIcon;
}> = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "accounts", label: "Pocket", icon: Wallet },
    { id: "assistant", label: "Copilot", icon: Bot },
    { id: "manage", label: "Settings", icon: Settings }
];
