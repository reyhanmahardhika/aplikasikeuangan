/* Generated from App.tsx. Review before commit. */

import { formatRupiahInput, jakartaDateParts } from "./format";

export function successMessageFor(path: string, method: string) {
    if (path.includes("/assistant/") || path.includes("/receipts/upload") || path.includes("/process"))
        return null;
    if (path === "/transactions" && method === "POST")
        return "Berhasil menambah transaksi";
    if (path.startsWith("/transactions/") && method === "PUT")
        return "Berhasil mengubah transaksi";
    if (path.startsWith("/transactions/") && method === "DELETE")
        return "Berhasil menghapus transaksi";
    if (path === "/transfers" && method === "POST")
        return "Berhasil transfer antar pocket";
    if (path.includes("/receipts/") && path.endsWith("/confirm") && method === "POST")
        return "Berhasil menambah transaksi dari struk";
    if (path === "/accounts" && method === "POST")
        return "Berhasil menambah pocket";
    if (path.endsWith("/reset") && path.startsWith("/accounts/") && method === "POST")
        return "Pocket berhasil direset";
    if (path === "/accounts/order" && method === "PUT")
        return null;
    if (path.startsWith("/accounts/") && method === "PUT")
        return "Berhasil mengubah pocket";
    if (path === "/categories" && method === "POST")
        return "Berhasil menambah kategori";
    if (path.startsWith("/categories/") && method === "PUT")
        return "Berhasil mengubah kategori";
    if (path.startsWith("/categories/") && method === "DELETE")
        return "Berhasil menghapus kategori";
    if (path === "/budgets" && method === "POST")
        return "Berhasil menyimpan budget";
    if (path.startsWith("/budgets/") && method === "PUT")
        return "Berhasil mengubah budget";
    if (path === "/schedules" && method === "POST")
        return "Berhasil menambah jadwal";
    if (path.startsWith("/schedules/") && method === "PUT")
        return "Berhasil mengubah jadwal";
    if (path.startsWith("/schedules/") && method === "DELETE")
        return "Berhasil menghapus jadwal";
    return null;
}

export function moneyInputValue(value: string | number | null | undefined) {
    return formatRupiahInput(String(value ?? "").replace(/\.00$/, ""));
}

export function dateFilterIso(value: string, boundary: "start" | "end") {
    return new Date(`${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}+07:00`).toISOString();
}

export function currentMonthDateBounds() {
    const now = jakartaDateParts();
    const endDay = new Date(Date.UTC(now.year, now.month, 0)).getUTCDate();
    return {
        from: `${now.year}-${String(now.month).padStart(2, "0")}-01`,
        to: `${now.year}-${String(now.month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`
    };
}
