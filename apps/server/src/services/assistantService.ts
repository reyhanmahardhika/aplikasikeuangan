import { pool } from "../db/pool.js";
import { formatRupiah } from "../utils/money.js";
import { answerProductKnowledge } from "./productKnowledgeService.js";
import { excludeInternalTransferLedger } from "./transactionAggregationScope.js";

type AssistantReply = {
  answer: string;
  disclaimer: string | null;
  suggestions?: string[];
  tone?: "positive" | "warning" | "danger" | "neutral";
  highlights?: Array<{
    label: string;
    value: string;
    tone: "positive" | "warning" | "danger" | "neutral";
  }>;
  actions?: Array<{ label: string; view: string }>;
};

type AssistantLanguage = "en" | "id";
type AssistantContext = {
  contextType?: "personal" | "goal" | "budget" | "investment";
  entityType?: string;
  entityId?: string;
  sourcePage?: string;
};

function defaultSuggestions(language: AssistantLanguage) {
  return language === "en"
    ? ["Can I afford shoes for 1 million?", "Check my finances this month", "Any bills due soon?", "How do I use the app features?"]
    : ["Boleh beli sepatu 1 juta?", "Cek kondisi keuangan bulan ini", "Ada tagihan yang segera jatuh tempo?", "Bagaimana cara menggunakan fitur aplikasi?"];
}

function startOfMonth(offset = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

function startOfWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setDate(now.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function normalizeQuestion(question: string) {
  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function isSpendingDecisionQuestion(question: string) {
  const normalized = normalizeQuestion(question);
  const amount = parseAssistantAmount(question);
  const decisionWords = [
    "boleh", "aman", "mampu", "cukup", "ingin", "mau", "pengen", "pingin", "rencana", "kepikiran",
    "can i", "can we", "can afford", "should i", "want to", "wanna", "planning to", "thinking of", "is it safe"
  ];
  const spendingWords = [
    "beli", "belanja", "pesan", "bayar", "booking", "book", "order", "nonton", "pergi", "liburan",
    "top up", "upgrade", "langganan", "buy", "purchase", "spend", "pay", "watch", "travel", "subscribe"
  ];
  const explicitAffordability = hasAny(normalized, [
    "boleh beli", "aman beli", "bisa beli", "cukup beli", "mampu beli", "layak beli",
    "can i buy", "can i afford", "should i buy", "safe to buy"
  ]);
  return explicitAffordability || Boolean(
    amount &&
    hasAny(normalized, decisionWords) &&
    hasAny(normalized, spendingWords)
  );
}

function monthLabel(value: string | Date, language: AssistantLanguage) {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" }).format(new Date(value));
}

function localizedCategory(name: string | null | undefined, language: AssistantLanguage) {
  if (!name) return language === "en" ? "Uncategorized" : "Tanpa kategori";
  if (language === "id") return name;
  const translations: Record<string, string> = {
    "makanan dan minuman": "Food & Drinks",
    makanan: "Food",
    belanja: "Shopping",
    transportasi: "Transportation",
    hiburan: "Entertainment",
    tagihan: "Bills",
    kesehatan: "Health",
    pendidikan: "Education",
    cicilan: "Installments",
    investasi: "Investments",
    gaji: "Salary",
    bonus: "Bonus",
    "pengeluaran lainnya": "Other Expenses",
    "pendapatan lainnya": "Other Income"
  };
  return translations[name.toLowerCase()] ?? name;
}

function compactList(rows: Array<{ name?: string | null; total: string }>, language: AssistantLanguage) {
  return rows.map((row) => `${localizedCategory(row.name, language)} (${formatRupiah(row.total)})`).join(", ");
}
export function parseAssistantAmount(question: string) {
  const text = question.toLowerCase();
  const matches = Array.from(text.matchAll(/(?:rp\s*)?(\d+(?:[.,]\d{1,3})*)\s*(rb|ribu|k|jt|juta|mio|m|million|mil|mn|billion|bn)?\b/gi));
  const amounts = matches.flatMap((match) => {
    const raw = match[1];
    const unit = match[2]?.toLowerCase();
    let value: number;
    if (unit) {
      const decimal = Number(raw.replace(",", "."));
      const multiplier = ["rb", "ribu", "k"].includes(unit)
        ? 1_000
        : ["billion", "bn"].includes(unit)
          ? 1_000_000_000
          : 1_000_000;
      value = decimal * multiplier;
    } else {
      const grouped = /^[0-9]{1,3}(?:[.,][0-9]{3})+$/.test(raw);
      value = Number(grouped ? raw.replace(/[.,]/g, "") : raw.replace(",", "."));
    }
    return Number.isFinite(value) && value > 0 ? [value] : [];
  });
  return amounts.length ? Math.max(...amounts) : null;
}

function categoryKeywords(name: string) {
  const normalizedName = normalizeQuestion(name);
  const groups: Array<{ names: string[]; words: string[] }> = [
    { names: ["belanja", "shopping"], words: ["sepatu", "shoes", "baju", "tas", "bag", "skincare", "kosmetik", "belanja", "shopping"] },
    { names: ["makanan", "minuman", "food"], words: ["makan", "kopi", "coffee", "cafe", "resto", "gofood", "grabfood"] },
    { names: ["hiburan", "entertainment"], words: ["nonton", "bioskop", "konser", "concert", "game", "netflix", "spotify", "liburan"] },
    { names: ["transport"], words: ["gojek", "grab", "mrt", "krl", "bensin", "parkir", "transport", "pesawat", "pesawa", "tiket pesawat", "flight", "airline"] },
    { names: ["tagihan", "bill"], words: ["listrik", "internet", "wifi", "pulsa", "token", "sewa", "tagihan"] },
    { names: ["kesehatan", "health"], words: ["obat", "dokter", "klinik", "rumah sakit", "vitamin"] },
    { names: ["pendidikan", "education"], words: ["sekolah", "kuliah", "kursus", "buku", "spp"] }
  ];
  return groups.find((group) => group.names.some((alias) => normalizedName.includes(alias)))?.words ?? [];
}

function findRelevantBudget<T extends { name: string; budget: string; used: string; percent: string }>(
  question: string,
  budgets: T[]
) {
  const normalized = normalizeQuestion(question);
  return budgets.find((budget) => {
    const category = normalizeQuestion(budget.name);
    return normalized.includes(category) || categoryKeywords(category).some((word) => normalized.includes(word));
  }) ?? null;
}

function formatShortDate(value: string | Date, language: AssistantLanguage) {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short"
  }).format(new Date(value));
}

async function answerFinancialQuestionId(userId: string, question: string): Promise<AssistantReply> {
  const normalized = normalizeQuestion(question);
  const thisMonth = startOfMonth();
  const nextMonth = startOfMonth(1);
  const previousMonth = startOfMonth(-1);
  const week = startOfWeek();
  const transactionScope = excludeInternalTransferLedger();
  const transactionScopeT = excludeInternalTransferLedger("t");

  const [
    balance,
    thisMonthTotals,
    prevMonthTotals,
    topCategory,
    topCategories,
    foodWeek,
    topMerchant,
    highestExpenseMonth,
    budgetRisk,
    budgets,
    accounts,
    upcomingSchedules
  ] = await Promise.all([
    pool.query(
      `SELECT COALESCE(sum(CASE WHEN account_type = 'credit_card' THEN -current_balance ELSE current_balance END), 0)::text AS balance
       FROM accounts WHERE user_id = $1 AND is_active = true`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(sum(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0)::text AS income,
              COALESCE(sum(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0)::text AS expense
       FROM transactions WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date < $3
         AND ${transactionScope}`,
      [userId, thisMonth, nextMonth]
    ),
    pool.query(
      `SELECT COALESCE(sum(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0)::text AS expense
       FROM transactions WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date < $3
         AND ${transactionScope}`,
      [userId, previousMonth, thisMonth]
    ),
    pool.query(
      `SELECT c.name, COALESCE(sum(t.amount), 0)::text AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.transaction_type = 'expense' AND t.transaction_date >= $2 AND t.transaction_date < $3
         AND ${transactionScopeT}
       GROUP BY c.name ORDER BY sum(t.amount) DESC LIMIT 1`,
      [userId, thisMonth, nextMonth]
    ),
    pool.query<{ name: string | null; total: string }>(
      `SELECT c.name, COALESCE(sum(t.amount), 0)::text AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.transaction_type = 'expense'
         AND t.transaction_date >= $2 AND t.transaction_date < $3
         AND ${transactionScopeT}
       GROUP BY c.name ORDER BY sum(t.amount) DESC LIMIT 3`,
      [userId, thisMonth, nextMonth]
    ),
    pool.query(
      `SELECT COALESCE(sum(t.amount), 0)::text AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.transaction_type = 'expense'
         AND t.transaction_date >= $2
         AND ${transactionScopeT}
         AND (lower(c.name) LIKE '%makanan%' OR lower(c.name) LIKE '%food%')`,
      [userId, week]
    ),
    pool.query(
      `SELECT COALESCE(merchant_name, 'Tanpa merchant') AS merchant, COALESCE(sum(amount), 0)::text AS total
       FROM transactions
       WHERE user_id = $1 AND transaction_type = 'expense'
         AND transaction_date >= $2 AND transaction_date < $3
         AND ${transactionScope}
       GROUP BY merchant_name ORDER BY sum(amount) DESC LIMIT 1`,
      [userId, thisMonth, nextMonth]
    ),
    pool.query(
      `SELECT date_trunc('month', transaction_date)::date AS month, COALESCE(sum(amount), 0)::text AS total
       FROM transactions
       WHERE user_id = $1 AND transaction_type = 'expense'
         AND ${transactionScope}
       GROUP BY 1 ORDER BY sum(amount) DESC LIMIT 1`,
      [userId]
    ),
    pool.query(
      `SELECT c.name, b.budget_amount::text AS budget,
              COALESCE(sum(t.amount), 0)::text AS used,
              CASE WHEN b.budget_amount > 0 THEN (COALESCE(sum(t.amount), 0) / b.budget_amount * 100) ELSE 0 END::numeric(8,2)::text AS percent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id
         AND t.transaction_type = 'expense'
         AND t.transaction_date >= $2 AND t.transaction_date < $3
         AND ${transactionScopeT}
       WHERE b.user_id = $1 AND b.month = $4 AND b.year = $5
       GROUP BY c.name, b.budget_amount
       ORDER BY (COALESCE(sum(t.amount), 0) / b.budget_amount) DESC LIMIT 1`,
      [userId, thisMonth, nextMonth, thisMonth.getMonth() + 1, thisMonth.getFullYear()]
    ),
    pool.query<{ name: string; budget: string; used: string; percent: string }>(
      `SELECT c.name, b.budget_amount::text AS budget,
              COALESCE(sum(t.amount), 0)::text AS used,
              CASE WHEN b.budget_amount > 0 THEN (COALESCE(sum(t.amount), 0) / b.budget_amount * 100) ELSE 0 END::numeric(8,2)::text AS percent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id
         AND t.transaction_type = 'expense'
         AND t.transaction_date >= $2 AND t.transaction_date < $3
         AND ${transactionScopeT}
       WHERE b.user_id = $1 AND b.month = $4 AND b.year = $5
       GROUP BY c.name, b.budget_amount
       ORDER BY c.name`,
      [userId, thisMonth, nextMonth, thisMonth.getMonth() + 1, thisMonth.getFullYear()]
    ),
    pool.query<{ name: string; accountType: string; currentBalance: string }>(
      `SELECT name, account_type AS "accountType", current_balance::text AS "currentBalance"
       FROM accounts
       WHERE user_id = $1 AND is_active = true
       ORDER BY current_balance DESC`,
      [userId]
    ),
    pool.query<{ title: string; nextDueDate: string; amount: string | null }>(
      `SELECT title, next_due_date AS "nextDueDate", amount::text
       FROM schedules
       WHERE user_id = $1 AND is_active = true AND next_due_date >= CURRENT_DATE
       ORDER BY next_due_date ASC
       LIMIT 5`,
      [userId]
    )
  ]);

  const income = Number(thisMonthTotals.rows[0].income);
  const expense = Number(thisMonthTotals.rows[0].expense);
  const prevExpense = Number(prevMonthTotals.rows[0].expense);
  const balanceValue = Number(balance.rows[0].balance);
  const top = topCategory.rows[0];
  const biggestMonth = highestExpenseMonth.rows[0];
  const merchant = topMerchant.rows[0];
  const riskyBudget = budgetRisk.rows[0];
  const scheduledTotal = upcomingSchedules.rows.reduce((total, row) => total + Number(row.amount ?? 0), 0);
  const purchaseAmount = parseAssistantAmount(question);

  const wantsHelp = hasAny(normalized, ["bisa apa", "help", "bantuan", "menu", "contoh", "what can you"]);
  const wantsPurchaseDecision = isSpendingDecisionQuestion(question);
  const wantsBalance = hasAny(normalized, ["saldo", "balance", "sisa uang", "uang tersisa", "cash left", "remaining money"]);
  const wantsAccountBreakdown = wantsBalance && hasAny(normalized, ["akun", "rekening", "account", "wallet", "dompet", "mana"]);
  const wantsIncome = hasAny(normalized, ["pemasukan", "income", "uang masuk", "gaji masuk", "earning", "salary"]);
  const wantsExpense = hasAny(normalized, ["pengeluaran", "expense", "spending", "spent", "keluar", "belanja", "jajan"]);
  const wantsComparison = hasAny(normalized, ["bulan lalu", "last month", "dibanding", "compare", "lebih besar", "lebih kecil"]);
  const wantsTopMonth =
    hasAny(normalized, ["bulan apa", "bulan mana", "month"]) &&
    hasAny(normalized, ["terbesar", "terbanyak", "paling besar", "paling banyak", "boros", "biggest", "highest"]);
  const wantsTopCategory = hasAny(normalized, ["kategori", "category", "paling banyak", "terbesar", "top", "boros"]);
  const wantsMerchant = hasAny(normalized, ["merchant", "toko", "tempat", "vendor", "where", "dimana", "di mana"]);
  const wantsFoodWeek =
    hasAny(normalized, ["makan", "makanan", "food", "coffee", "kopi"]) &&
    hasAny(normalized, ["minggu", "week", "pekan"]);
  const wantsBudget = hasAny(normalized, ["budget", "anggaran", "limit", "sisa budget", "sisa anggaran"]);
  const wantsSavingAdvice = hasAny(normalized, ["hemat", "save", "saving", "kurangi", "dikurangi", "rekomendasi", "tips", "saran"]);
  const wantsPrediction = hasAny(normalized, ["prediksi", "estimasi", "forecast", "akhir bulan", "end month"]);
  const wantsSchedule = hasAny(normalized, ["jadwal", "tagihan", "jatuh tempo", "due", "schedule", "bayar apa"]);
  const wantsDebt = hasAny(normalized, ["utang", "hutang", "piutang", "harus dibayar", "harus diterima", "owe", "owed", "debt"]);
  const wantsHealthCheck = hasAny(normalized, [
    "cek kondisi", "kondisi keuangan", "financial health", "keuangan sehat", "aman bulan ini",
    "apa yang perlu", "perlu diperhatikan", "bagian apa", "check my finances", "check my finance",
    "how are my finances", "financial check"
  ]);

  if (wantsPurchaseDecision) {
    if (!purchaseAmount) {
      return {
        answer: "Bisa aku cek, tapi tulis juga nominalnya. Contoh: “Boleh beli sepatu 1 juta?”",
        disclaimer: null,
        tone: "neutral",
        suggestions: ["Boleh beli sepatu 1 juta?", "Boleh nonton konser 750rb?"]
      };
    }

    const relevantBudget = findRelevantBudget(question, budgets.rows);
    const budgetAfterPercent = relevantBudget
      ? ((Number(relevantBudget.used) + purchaseAmount) / Number(relevantBudget.budget)) * 100
      : null;
    const balanceAfter = balanceValue - purchaseAmount;
    const netAfter = income - expense - purchaseAmount;
    const expenseRatioAfter = income > 0 ? ((expense + purchaseAmount) / income) * 100 : null;
    const availableAfterCommitments = balanceValue - scheduledTotal - purchaseAmount;

    let tone: AssistantReply["tone"] = "positive";
    let verdict = "Boleh. Kondisi saat ini masih cukup aman.";
    const reasons: string[] = [];

    if (balanceAfter < 0 || availableAfterCommitments < 0) {
      tone = "danger";
      verdict = "Sebaiknya jangan dulu.";
      reasons.push(`Setelah pembelian dan kewajiban yang tercatat, dana berpotensi kurang ${formatRupiah(Math.abs(Math.min(availableAfterCommitments, balanceAfter)))}.`);
    } else if ((budgetAfterPercent !== null && budgetAfterPercent > 100) || (expenseRatioAfter !== null && expenseRatioAfter > 100)) {
      tone = "danger";
      verdict = "Bisa dibayar, tapi belum aman untuk kondisi bulan ini.";
      if (budgetAfterPercent !== null && budgetAfterPercent > 100) {
        reasons.push(`Budget ${relevantBudget!.name} akan terlewati ${Math.round(budgetAfterPercent - 100)}%.`);
      } else {
        reasons.push("Pengeluaran bulan ini akan melebihi pemasukan.");
      }
    } else if ((budgetAfterPercent !== null && budgetAfterPercent >= 85) || (expenseRatioAfter !== null && expenseRatioAfter >= 85)) {
      tone = "warning";
      verdict = "Boleh, tapi ruang keuangan bulan ini akan cukup ketat.";
      if (budgetAfterPercent !== null) reasons.push(`Budget ${relevantBudget!.name} akan terpakai ${Math.round(budgetAfterPercent)}%.`);
      if (expenseRatioAfter !== null && expenseRatioAfter >= 85) reasons.push(`Total pengeluaran akan mencapai ${Math.round(expenseRatioAfter)}% dari pemasukan bulan ini.`);
    } else if (!relevantBudget) {
      tone = "warning";
      verdict = "Saldo mencukupi, tetapi belum ada budget kategori untuk mengukur batas amannya.";
    }

    if (scheduledTotal > 0) reasons.push(`Ada jadwal pembayaran mendatang senilai ${formatRupiah(scheduledTotal)}.`);

    return {
      answer: [verdict, ...reasons].join(" "),
      disclaimer: "Perhitungan memakai saldo, transaksi, budget, dan jadwal yang tercatat di aplikasi.",
      tone,
      highlights: [
        { label: "Harga", value: formatRupiah(purchaseAmount), tone: "neutral" },
        {
          label: "Sisa saldo",
          value: formatRupiah(balanceAfter),
          tone: balanceAfter < 0 ? "danger" : balanceAfter < balanceValue * 0.2 ? "warning" : "positive"
        },
        {
          label: relevantBudget ? `Budget ${relevantBudget.name}` : "Net setelah beli",
          value: relevantBudget && budgetAfterPercent !== null ? `${Math.round(budgetAfterPercent)}% terpakai` : formatRupiah(netAfter),
          tone: budgetAfterPercent !== null && budgetAfterPercent > 100 ? "danger" : budgetAfterPercent !== null && budgetAfterPercent >= 85 ? "warning" : "neutral"
        }
      ],
      suggestions: ["Cek kondisi keuangan bulan ini", "Budget mana yang hampir habis?", "Ada tagihan terdekat?"]
    };
  }

  if (wantsHelp) {
    return {
      answer: "Aku bisa membantu mengambil keputusan belanja, mengecek kesehatan arus kas, memantau budget, melihat tagihan terdekat, dan membandingkan transaksi dari data aplikasi.",
      disclaimer: null,
      suggestions: defaultSuggestions("id")
    };
  }

  if (wantsHealthCheck) {
    const expenseRatio = income > 0 ? (expense / income) * 100 : null;
    const net = income - expense;
    const warnings: string[] = [];
    if (riskyBudget && Number(riskyBudget.percent) >= 80) warnings.push(`Budget ${riskyBudget.name} sudah ${Math.round(Number(riskyBudget.percent))}%.`);
    if (expenseRatio !== null && expenseRatio >= 85) warnings.push(`Pengeluaran sudah ${Math.round(expenseRatio)}% dari pemasukan.`);
    if (scheduledTotal > 0) warnings.push(`Pembayaran terjadwal berikutnya berjumlah ${formatRupiah(scheduledTotal)}.`);
    const tone: AssistantReply["tone"] = net < 0 ? "danger" : warnings.length ? "warning" : "positive";
    return {
      answer: warnings.length
        ? `Ada ${warnings.length} hal yang perlu diperhatikan. ${warnings.join(" ")}`
        : "Kondisi bulan ini terlihat terkendali dari data yang tercatat. Belum ada budget atau kewajiban yang masuk zona risiko.",
      disclaimer: "Kondisi dinilai dari data yang sudah dicatat di aplikasi.",
      tone,
      highlights: [
        { label: "Net bulan ini", value: formatRupiah(net), tone: net < 0 ? "danger" : "positive" },
        { label: "Rasio keluar", value: expenseRatio === null ? "Belum terukur" : `${Math.round(expenseRatio)}%`, tone: expenseRatio !== null && expenseRatio >= 85 ? "warning" : "neutral" },
        { label: "Jadwal bayar", value: formatRupiah(scheduledTotal), tone: scheduledTotal > balanceValue ? "danger" : "neutral" }
      ],
      suggestions: ["Boleh beli sepatu 1 juta?", "Detail budget bulan ini", "Tampilkan saldo per akun"]
    };
  }

  if (wantsSchedule) {
    const nearest = upcomingSchedules.rows[0];
    return {
      answer: nearest
        ? `Jadwal terdekat adalah ${nearest.title} pada ${formatShortDate(nearest.nextDueDate, "id")}${nearest.amount ? ` sebesar ${formatRupiah(nearest.amount)}` : ""}. Total nominal dari ${upcomingSchedules.rows.length} jadwal terdekat adalah ${formatRupiah(scheduledTotal)}.`
        : "Tidak ada pembayaran terjadwal yang akan datang.",
      disclaimer: null,
      tone: nearest ? "warning" : "positive",
      highlights: nearest ? upcomingSchedules.rows.slice(0, 3).map((row) => ({
        label: formatShortDate(row.nextDueDate, "id"),
        value: `${row.title}${row.amount ? ` · ${formatRupiah(row.amount)}` : ""}`,
        tone: "neutral" as const
      })) : undefined,
      suggestions: ["Cek kondisi keuangan bulan ini", "Berapa saldo sekarang?"]
    };
  }

  if (wantsDebt) {
    return {
      answer: "Fitur utang-piutang/grup tidak tersedia di navigasi aktif saat ini, jadi aku tidak menghitung data sosial lama di Copilot.",
      disclaimer: null,
      tone: "neutral",
      suggestions: ["Cek kondisi keuangan bulan ini", "Berapa saldo sekarang?"]
    };
  }

  if (wantsAccountBreakdown) {
    return {
      answer: accounts.rows.length
        ? `Ada ${accounts.rows.length} akun aktif dengan total saldo bersih ${formatRupiah(balanceValue)}.`
        : "Belum ada akun aktif.",
      disclaimer: null,
      tone: balanceValue < 0 ? "danger" : "neutral",
      highlights: accounts.rows.slice(0, 4).map((account) => ({
        label: account.name,
        value: formatRupiah(account.accountType === "credit_card" ? -Number(account.currentBalance) : account.currentBalance),
        tone: Number(account.currentBalance) < 0 ? "danger" as const : "neutral" as const
      })),
      suggestions: ["Cek kondisi keuangan bulan ini", "Ada tagihan terdekat?"]
    };
  }

  if (wantsTopMonth) {
    return {
      answer: biggestMonth
        ? `Pengeluaran terbesar sejauh ini ada di ${monthLabel(biggestMonth.month, "id")} sebesar ${formatRupiah(biggestMonth.total)}.`
        : "Belum ada data pengeluaran untuk dibandingkan antarbulan.",
      disclaimer: null,
      suggestions: ["Kategori apa yang paling boros bulan ini?", "Bagaimana cara mengurangi pengeluaran?", "Berapa pengeluaran bulan ini?"]
    };
  }

  if (wantsBalance) {
    return {
      answer: `Saldo saat ini adalah ${formatRupiah(balanceValue)}.`,
      disclaimer: null,
      suggestions: ["Berapa pengeluaran bulan ini?", "Prediksi saldo akhir bulan", "Budget mana yang hampir habis?"]
    };
  }

  if (wantsFoodWeek) {
    return {
      answer: `Total pengeluaran makanan minggu ini adalah ${formatRupiah(foodWeek.rows[0].total)}.`,
      disclaimer: null,
      suggestions: ["Kategori paling boros bulan ini", "Pengeluaran bulan ini dibanding bulan lalu"]
    };
  }

  if (wantsBudget) {
    if (!riskyBudget) {
      return {
        answer: "Belum ada anggaran bulan ini. Anda bisa membuat budget di menu Kelola agar aku bisa bantu memantau batas pengeluaran.",
        disclaimer: null,
        suggestions: ["Kategori paling boros bulan ini", "Berapa pengeluaran bulan ini?"]
      };
    }
    return {
      answer: `Budget yang paling perlu dipantau adalah ${riskyBudget.name}: sudah terpakai ${formatRupiah(riskyBudget.used)} dari ${formatRupiah(riskyBudget.budget)} (${Number(riskyBudget.percent).toFixed(0)}%).`,
      disclaimer: null,
      suggestions: ["Bagaimana cara mengurangi pengeluaran?", "Kategori paling boros bulan ini"]
    };
  }

  if (wantsMerchant) {
    return {
      answer: merchant
        ? `Merchant/tempat pengeluaran terbesar bulan ini adalah ${merchant.merchant} sebesar ${formatRupiah(merchant.total)}.`
        : "Belum ada data merchant pengeluaran bulan ini.",
      disclaimer: null,
      suggestions: ["Kategori paling boros bulan ini", "Pengeluaran terbesar bulan apa?"]
    };
  }

  if (wantsExpense) {
    if (wantsComparison) {
      const difference = expense - prevExpense;
      const direction = difference > 0 ? "lebih besar" : difference < 0 ? "lebih kecil" : "sama";
      return {
        answer: `Pengeluaran bulan ini ${formatRupiah(expense)} dan bulan lalu ${formatRupiah(prevExpense)}. Bulan ini ${direction} ${formatRupiah(Math.abs(difference))}.`,
        disclaimer: null,
        suggestions: ["Pengeluaran terbesar bulan apa?", "Kategori paling boros bulan ini"]
      };
    }
    return {
      answer: `Total pengeluaran bulan ini adalah ${formatRupiah(expense)}.`,
      disclaimer: null,
      suggestions: ["Bandingkan dengan bulan lalu", "Kategori paling boros bulan ini", "Bagaimana cara hemat?"]
    };
  }

  if (wantsIncome) {
    return {
      answer: `Total pemasukan bulan ini adalah ${formatRupiah(income)}.`,
      disclaimer: null,
      suggestions: ["Berapa saldo sekarang?", "Berapa net bulan ini?"]
    };
  }

  if (wantsTopCategory) {
    return {
      answer: top ? `Kategori pengeluaran terbesar bulan ini adalah ${top.name ?? "Tanpa kategori"} sebesar ${formatRupiah(top.total)}.` : "Belum ada pengeluaran bulan ini.",
      disclaimer: null,
      suggestions: ["Bagaimana cara mengurangi pengeluaran?", "Merchant terbesar bulan ini"]
    };
  }

  if (wantsSavingAdvice) {
    const items = compactList(topCategories.rows, "id");
    return {
      answer: items ? `Area yang paling masuk akal untuk dievaluasi: ${items}. Mulai dari kategori terbesar, lalu cek transaksi yang sifatnya tidak wajib.` : "Belum ada data pengeluaran yang cukup untuk rekomendasi.",
      disclaimer: "Ini estimasi berbasis data transaksi, bukan nasihat keuangan profesional.",
      suggestions: ["Budget mana yang hampir habis?", "Pengeluaran bulan ini dibanding bulan lalu"]
    };
  }

  if (wantsPrediction) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsed = Math.max(now.getDate(), 1);
    const projectedExpense = (expense / elapsed) * daysInMonth;
    const projectedBalance = balanceValue + income - projectedExpense;
    return {
      answer: `Dengan pola bulan ini, estimasi saldo akhir bulan sekitar ${formatRupiah(projectedBalance)}.`,
      disclaimer: "Ini estimasi berbasis pola transaksi saat ini, bukan nasihat keuangan profesional.",
      suggestions: ["Bagaimana cara hemat?", "Kategori paling boros bulan ini"]
    };
  }

  if (hasAny(normalized, ["ringkasan", "summary", "overview", "net", "bulan ini"])) {
    const net = income - expense;
    return {
      answer: `Bulan ini pemasukan ${formatRupiah(income)}, pengeluaran ${formatRupiah(expense)}, net ${formatRupiah(net)}, dan saldo saat ini ${formatRupiah(balanceValue)}.`,
      disclaimer: null,
      suggestions: ["Kategori paling boros bulan ini", "Prediksi saldo akhir bulan"]
    };
  }

  return {
    answer: "Aku belum menangkap maksud pertanyaannya. Anda bisa tanya dengan kata pendek seperti saldo, pengeluaran, pemasukan, budget, kategori, merchant, hemat, atau prediksi.",
    disclaimer: null,
    suggestions: defaultSuggestions("id")
  };
}

const suggestionTranslations: Record<string, string> = {
  "Boleh beli sepatu 1 juta?": "Can I afford shoes for 1 million?",
  "Boleh nonton konser 750rb?": "Can I afford a concert ticket for 750k?",
  "Cek kondisi keuangan bulan ini": "Check my finances this month",
  "Budget mana yang hampir habis?": "Which budget is almost used up?",
  "Ada tagihan terdekat?": "Any bills due soon?",
  "Ada tagihan yang segera jatuh tempo?": "Any bills due soon?",
  "Bagaimana cara menggunakan fitur aplikasi?": "How do I use the app features?",
  "Detail budget bulan ini": "Show this month's budget details",
  "Tampilkan saldo per akun": "Show balances by account",
  "Berapa saldo sekarang?": "What is my current balance?",
  "Kategori apa yang paling boros bulan ini?": "Which category has the highest spending this month?",
  "Kategori paling boros bulan ini": "Highest spending category this month",
  "Bagaimana cara mengurangi pengeluaran?": "How can I reduce my spending?",
  "Bagaimana cara hemat?": "How can I save money?",
  "Berapa pengeluaran bulan ini?": "How much have I spent this month?",
  "Prediksi saldo akhir bulan": "Forecast my month-end balance",
  "Pengeluaran bulan ini dibanding bulan lalu": "Compare this month's spending with last month",
  "Pengeluaran terbesar bulan apa?": "Which month had the highest spending?",
  "Bandingkan dengan bulan lalu": "Compare with last month",
  "Berapa net bulan ini?": "What is my net cash flow this month?",
  "Merchant terbesar bulan ini": "Top merchant this month"
};

function translateAssistantAnswer(answer: string) {
  let translated = answer;
  const replacements: Array<[RegExp, string]> = [
    [/Bisa aku cek, tapi tulis juga nominalnya\. Contoh: .*?Boleh beli sepatu 1 juta\?.*?/, "I can check that, but please include the amount. For example: “Can I afford shoes for 1 million?”"],
    [/Boleh\. Kondisi saat ini masih cukup aman\./, "Yes. Your current finances can comfortably cover it."],
    [/Sebaiknya jangan dulu\./, "It would be better to wait."],
    [/Bisa dibayar, tapi belum aman untuk kondisi bulan ini\./, "You can pay for it, but it is not a safe choice for this month."],
    [/Boleh, tapi ruang keuangan bulan ini akan cukup ketat\./, "You can, but your finances will be fairly tight this month."],
    [/Saldo mencukupi, tetapi belum ada budget kategori untuk mengukur batas amannya\./, "Your balance can cover it, but there is no category budget to measure a safe limit."],
    [/Setelah pembelian dan kewajiban yang tercatat, dana berpotensi kurang (Rp[\s\u00a0]*[\d.]+)\./, "After this purchase and your recorded obligations, you could be short by $1."],
    [/Budget (.+?) akan terlewati (\d+)%\./, "The $1 budget would be exceeded by $2%."],
    [/Budget (.+?) akan terpakai (\d+)%\./, "The $1 budget would reach $2%."],
    [/Pengeluaran bulan ini akan melebihi pemasukan\./, "This month's expenses would exceed your income."],
    [/Total pengeluaran akan mencapai (\d+)% dari pemasukan bulan ini\./, "Total expenses would reach $1% of this month's income."],
    [/Ada jadwal pembayaran mendatang senilai (Rp[\s\u00a0]*[\d.]+)\./, "You have $1 in upcoming scheduled payments."],
    [/Utang bersama yang masih tercatat sebesar (Rp[\s\u00a0]*[\d.]+)\./, "You also have $1 in recorded shared debt."],
    [/Aku bisa membantu mengambil keputusan belanja, mengecek kesehatan arus kas, memantau budget, melihat tagihan terdekat, membandingkan transaksi, dan membaca utang-piutang dari data aplikasi\./, "I can help with purchase decisions, cash-flow health checks, budget monitoring, upcoming bills, transaction comparisons, and shared debts based on your app data."],
    [/Ada (\d+) hal yang perlu diperhatikan\./, "There are $1 things that need attention."],
    [/Budget (.+?) sudah (\d+)%\./, "The $1 budget is already at $2%."],
    [/Pengeluaran sudah (\d+)% dari pemasukan\./, "Expenses are already $1% of income."],
    [/Pembayaran terjadwal berikutnya berjumlah (Rp[\s\u00a0]*[\d.]+)\./, "Upcoming scheduled payments total $1."],
    [/Utang bersama yang tercatat (Rp[\s\u00a0]*[\d.]+)\./, "Recorded shared debt totals $1."],
    [/Kondisi bulan ini terlihat terkendali dari data yang tercatat\. Belum ada budget atau kewajiban yang masuk zona risiko\./, "This month's finances look under control based on your recorded data. No budgets or obligations are currently in the risk zone."],
    [/Tidak ada pembayaran terjadwal yang akan datang\./, "There are no upcoming scheduled payments."],
    [/Saat ini Anda perlu membayar (Rp[\s\u00a0]*[\d.]+) dan masih perlu menerima (Rp[\s\u00a0]*[\d.]+) dari transaksi bersama\./, "You currently need to pay $1 and are still due to receive $2 from shared transactions."],
    [/Ada (\d+) akun aktif dengan total saldo bersih (Rp[\s\u00a0]*[\d.]+)\./, "You have $1 active accounts with a total net balance of $2."],
    [/Belum ada akun aktif\./, "There are no active accounts yet."],
    [/Belum ada data pengeluaran untuk dibandingkan antarbulan\./, "There is not enough expense data for a month-to-month comparison yet."],
    [/Saldo saat ini adalah (Rp[\s\u00a0]*[\d.]+)\./, "Your current balance is $1."],
    [/Total pengeluaran makanan minggu ini adalah (Rp[\s\u00a0]*[\d.]+)\./, "Your total food spending this week is $1."],
    [/Belum ada anggaran bulan ini\. Anda bisa membuat budget di menu Kelola agar aku bisa bantu memantau batas pengeluaran\./, "There is no budget for this month yet. Create one in Settings so I can help monitor your spending limits."],
    [/Budget yang paling perlu dipantau adalah (.+?): sudah terpakai ([^ ]+) dari ([^ ]+) \((\d+)%\)\./, "The budget that needs the most attention is $1: $2 of $3 has been used ($4%)."],
    [/Belum ada data merchant pengeluaran bulan ini\./, "There is no merchant spending data for this month yet."],
    [/Total pengeluaran bulan ini adalah (Rp[\s\u00a0]*[\d.]+)\./, "Your total spending this month is $1."],
    [/Total pemasukan bulan ini adalah (Rp[\s\u00a0]*[\d.]+)\./, "Your total income this month is $1."],
    [/Belum ada pengeluaran bulan ini\./, "There are no expenses recorded this month."],
    [/Area yang paling masuk akal untuk dievaluasi: (.+)\. Mulai dari kategori terbesar, lalu cek transaksi yang sifatnya tidak wajib\./, "The most useful areas to review are: $1. Start with the largest category, then check which transactions were optional."],
    [/Belum ada data pengeluaran yang cukup untuk rekomendasi\./, "There is not enough expense data to make a recommendation yet."],
    [/Dengan pola bulan ini, estimasi saldo akhir bulan sekitar (Rp[\s\u00a0]*-?[\d.]+)\./, "Based on this month's pattern, your estimated month-end balance is around $1."],
    [/Aku belum menangkap maksud pertanyaannya\. Anda bisa tanya dengan kata pendek seperti saldo, pengeluaran, pemasukan, budget, kategori, merchant, hemat, atau prediksi\./, "I did not understand that question. Try asking about your balance, spending, income, budgets, categories, merchants, saving, or forecasts."]
  ];
  for (const [pattern, replacement] of replacements) translated = translated.replace(pattern, replacement);

  translated = translated
    .replace(/Jadwal terdekat adalah (.+?) pada (.+?)(?: sebesar (.+?))?\. Total nominal dari (\d+) jadwal terdekat adalah (.+)\./, (_match, title, date, amount, count, total) =>
      `Your nearest schedule is ${title} on ${date}${amount ? ` for ${amount}` : ""}. The total for your next ${count} schedules is ${total}.`)
    .replace(/Pengeluaran terbesar sejauh ini ada di (.+?) sebesar (.+)\./, "Your highest spending so far was in $1 at $2.")
    .replace(/Merchant\/tempat pengeluaran terbesar bulan ini adalah (.+?) sebesar (.+)\./, "Your top spending merchant this month is $1 at $2.")
    .replace(/Pengeluaran bulan ini (.+?) dan bulan lalu (.+?)\. Bulan ini lebih besar (.+?)\./, "Spending is $1 this month and $2 last month. This month is $3 higher.")
    .replace(/Pengeluaran bulan ini (.+?) dan bulan lalu (.+?)\. Bulan ini lebih kecil (.+?)\./, "Spending is $1 this month and $2 last month. This month is $3 lower.")
    .replace(/Pengeluaran bulan ini (.+?) dan bulan lalu (.+?)\. Bulan ini sama (.+?)\./, "Spending is $1 this month and $2 last month. The difference is $3.")
    .replace(/Kategori pengeluaran terbesar bulan ini adalah (.+?) sebesar (.+)\./, "Your highest spending category this month is $1 at $2.")
    .replace(/Bulan ini pemasukan (.+?), pengeluaran (.+?), net (.+?), dan saldo saat ini (.+)\./, "This month, income is $1, spending is $2, net cash flow is $3, and your current balance is $4.");

  const monthTranslations: Record<string, string> = {
    Januari: "January", Februari: "February", Maret: "March", April: "April", Mei: "May", Juni: "June",
    Juli: "July", Agustus: "August", September: "September", Oktober: "October", November: "November", Desember: "December"
  };
  for (const [id, en] of Object.entries(monthTranslations)) translated = translated.replace(new RegExp(`\\b${id}\\b`, "g"), en);
  const categoryTranslations: Record<string, string> = {
    "Makanan dan minuman": "Food & Drinks",
    Makanan: "Food",
    Belanja: "Shopping",
    Transportasi: "Transportation",
    Hiburan: "Entertainment",
    Tagihan: "Bills",
    Kesehatan: "Health",
    Pendidikan: "Education",
    Cicilan: "Installments",
    Investasi: "Investments",
    Gaji: "Salary",
    "Pengeluaran lainnya": "Other Expenses",
    "Pendapatan lainnya": "Other Income",
    "Tanpa kategori": "Uncategorized"
  };
  for (const [id, en] of Object.entries(categoryTranslations)) translated = translated.replace(new RegExp(`\\b${id}\\b`, "g"), en);
  return translated;
}

function translateAssistantReply(reply: AssistantReply): AssistantReply {
  const disclaimerTranslations: Record<string, string> = {
    "Perhitungan memakai saldo, transaksi, budget, jadwal, dan utang yang tercatat di aplikasi.": "This calculation uses the balances, transactions, budgets, schedules, and debts recorded in the app.",
    "Kondisi dinilai dari data yang sudah dicatat di aplikasi.": "This assessment uses the data recorded in the app.",
    "Hanya transaksi grup yang sudah dikonfirmasi yang dihitung.": "Only confirmed group transactions are included.",
    "Ini estimasi berbasis data transaksi, bukan nasihat keuangan profesional.": "This is an estimate based on transaction data, not professional financial advice.",
    "Ini estimasi berbasis pola transaksi saat ini, bukan nasihat keuangan profesional.": "This is an estimate based on your current transaction pattern, not professional financial advice."
  };
  const labelTranslations: Record<string, string> = {
    Harga: "Price",
    "Sisa saldo": "Balance after",
    "Net setelah beli": "Net after purchase",
    "Net bulan ini": "Net this month",
    "Rasio keluar": "Spending ratio",
    "Jadwal bayar": "Scheduled payments",
    "Harus dibayar": "You owe",
    "Harus diterima": "You are owed"
  };

  return {
    ...reply,
    answer: translateAssistantAnswer(reply.answer),
    disclaimer: reply.disclaimer ? disclaimerTranslations[reply.disclaimer] ?? reply.disclaimer : null,
    suggestions: reply.suggestions?.map((suggestion) => suggestionTranslations[suggestion] ?? suggestion),
    highlights: reply.highlights?.map((highlight) => ({
      ...highlight,
      label: labelTranslations[highlight.label] ?? (
        highlight.label.startsWith("Budget ")
          ? `Budget: ${localizedCategory(highlight.label.slice(7), "en")}`
          : highlight.label
      ),
      value: highlight.value.replace(/ terpakai$/, " used").replace("Belum terukur", "Not measured yet")
    }))
  };
}

export async function answerFinancialQuestion(
  userId: string,
  question: string,
  language: AssistantLanguage = "id",
  context?: AssistantContext
): Promise<AssistantReply> {
  const productAnswer = answerProductKnowledge(question, language);
  if (productAnswer) return productAnswer;
  const reply = await answerFinancialQuestionId(userId, question);
  return language === "en" ? translateAssistantReply(reply) : reply;
}
