export type ProductLanguage = "en" | "id";

export type ProductKnowledgeReply = {
  answer: string;
  disclaimer: null;
  tone: "neutral" | "warning";
  suggestions: string[];
  actions?: Array<{ label: string; view: string }>;
};

type KnowledgeTopic = {
  id: string;
  keywords: string[];
  answer: Record<ProductLanguage, string>;
  suggestions: Record<ProductLanguage, string[]>;
  action?: { view: string; label: Record<ProductLanguage, string> };
};

const topics: KnowledgeTopic[] = [
  {
    id: "product-overview",
    keywords: ["fitur aplikasi", "fitur apa", "cara menggunakan aplikasi", "bantuan aplikasi", "app features", "use the app", "product help"],
    answer: {
      id: "Aplikasi ini mencakup pencatatan transaksi berbantuan AI, akun dan transfer saldo, kategori, budget, jadwal serta notifikasi, laporan, attachment, pertemanan, split bill, grup, dan dompet bersama. Sebutkan fitur atau kendalanya agar aku dapat memberi langkah yang lebih spesifik.",
      en: "The app includes AI-assisted transaction entry, accounts and balance transfers, categories, budgets, schedules and notifications, reports, attachments, friends, split bills, groups, and shared wallets. Tell me which feature or issue you need help with for specific steps."
    },
    suggestions: {
      id: ["Cara tambah transaksi", "Cara tambah akun", "Kenapa notifikasi tidak muncul?"],
      en: ["How do I add a transaction?", "How do I add an account?", "Why are notifications not appearing?"]
    }
  },
  {
    id: "add-transaction",
    keywords: ["tambah transaksi", "add transaction", "catat transaksi", "record transaction", "ai quick add", "analisis transaksi"],
    answer: {
      id: "Buka Tambah Transaksi, tulis transaksi dengan bahasa natural, lalu pilih Analisis Transaksi. Periksa nominal, kategori, akun, dan metode pembayaran sebelum menekan Simpan Transaksi. Finance Copilot tidak akan menyimpan transaksi tanpa konfirmasi Anda.",
      en: "Open Add Transaction, describe the transaction naturally, then select Analyze Transaction. Review the amount, category, account, and payment method before selecting Save Transaction. Finance Copilot never saves it without your confirmation."
    },
    suggestions: {
      id: ["Kenapa transaksi gagal disimpan?", "Bagaimana mengedit transaksi?", "Bagaimana menambah attachment?"],
      en: ["Why can't I save a transaction?", "How do I edit a transaction?", "How do I add an attachment?"]
    },
    action: { view: "manual", label: { id: "Buka Tambah Transaksi", en: "Open Add Transaction" } }
  },
  {
    id: "transaction-save-error",
    keywords: ["transaksi gagal", "tidak bisa simpan transaksi", "gagal disimpan", "can't save transaction", "cannot save transaction", "transaction failed"],
    answer: {
      id: "Pastikan sudah ada akun aktif, nominal lebih dari nol, tanggal terisi, dan akun sumber dipilih. Jika form sudah benar tetapi masih gagal, periksa koneksi lalu coba lagi. Pesan sesi berakhir berarti Anda perlu login ulang; data form sebaiknya diperiksa kembali setelah masuk.",
      en: "Make sure you have an active account, the amount is above zero, the date is filled in, and a source account is selected. If the form is valid but still fails, check your connection and try again. A session-ended message means you need to sign in again."
    },
    suggestions: {
      id: ["Cara tambah akun", "Cara tambah transaksi", "Kenapa saldo akun berbeda?"],
      en: ["How do I add an account?", "How do I add a transaction?", "Why is my account balance different?"]
    },
    action: { view: "manual", label: { id: "Periksa form transaksi", en: "Review transaction form" } }
  },
  {
    id: "transaction-manage",
    keywords: ["edit transaksi", "hapus transaksi", "detail transaksi", "ubah transaksi", "edit transaction", "delete transaction", "transaction details"],
    answer: {
      id: "Buka Riwayat lalu tekan transaksi untuk melihat detail. Tekan Edit agar field dapat diubah. Penghapusan tersedia di halaman detail, melalui swipe pada riwayat, atau dengan menahan beberapa transaksi untuk hapus sekaligus.",
      en: "Open Transactions and select an item to view its details. Select Edit to make fields editable. You can delete it from the detail page, swipe it in the list, or hold multiple transactions for bulk deletion."
    },
    suggestions: {
      id: ["Bagaimana filter transaksi?", "Bagaimana menambah attachment?"],
      en: ["How do I filter transactions?", "How do I add an attachment?"]
    },
    action: { view: "history", label: { id: "Buka Riwayat", en: "Open Transactions" } }
  },
  {
    id: "attachment",
    keywords: ["attachment", "lampiran", "foto transaksi", "video transaksi", "upload file", "upload image", "receipt photo"],
    answer: {
      id: "Attachment dapat ditambahkan pada form transaksi atau transfer. Aplikasi menerima file gambar dan video, termasuk HEIC. Attachment hanya menjadi bukti pendukung dan tidak dibaca otomatis sebagai isi transaksi.",
      en: "Attachments can be added to transaction and transfer forms. The app accepts images and videos, including HEIC. Attachments are supporting evidence only and are not automatically read as transaction details."
    },
    suggestions: {
      id: ["Di mana melihat attachment?", "Cara tambah transaksi"],
      en: ["Where can I view an attachment?", "How do I add a transaction?"]
    },
    action: { view: "manual", label: { id: "Tambah transaksi", en: "Add transaction" } }
  },
  {
    id: "accounts",
    keywords: ["tambah akun", "edit akun", "reset akun", "saldo awal", "add account", "edit account", "reset account", "initial balance"],
    answer: {
      id: "Buka Atur lalu pilih Akun. Anda dapat menambah akun dengan saldo awal nol, mengedit detail dan saldo awal, melihat riwayat akun, atau mereset akun. Reset akan membersihkan transaksi terkait dan memulai saldo akun dari awal.",
      en: "Open Settings and select Accounts. You can add an account with a zero starting balance, edit its details and starting balance, view account history, or reset it. Reset clears related transactions and starts that account again."
    },
    suggestions: {
      id: ["Bagaimana transfer saldo?", "Kenapa saldo akun berbeda?"],
      en: ["How do I transfer a balance?", "Why is my account balance different?"]
    },
    action: { view: "manage", label: { id: "Buka Atur", en: "Open Settings" } }
  },
  {
    id: "balance-transfer",
    keywords: ["transfer saldo", "biaya admin", "fee transfer", "balance transfer", "transfer fee", "pindah saldo"],
    answer: {
      id: "Buka Atur lalu Akun dan pilih Transfer Saldo. Pilih akun sumber dan tujuan, masukkan nominal serta biaya admin jika ada. Saldo kedua akun ditampilkan sebelum konfirmasi, dan transfer akan dicatat ke riwayat transaksi.",
      en: "Open Settings, select Accounts, then Balance Transfer. Choose the source and destination accounts, enter the amount and any admin fee. Both balances are shown before confirmation, and the transfer is recorded in transaction history."
    },
    suggestions: {
      id: ["Cara tambah akun", "Di mana riwayat transfer?"],
      en: ["How do I add an account?", "Where is my transfer history?"]
    },
    action: { view: "manage", label: { id: "Kelola akun", en: "Manage accounts" } }
  },
  {
    id: "balance-mismatch",
    keywords: ["saldo berbeda", "saldo salah", "saldo tidak sesuai", "balance wrong", "incorrect balance", "balance mismatch"],
    answer: {
      id: "Saldo dihitung dari saldo awal ditambah pemasukan, dikurangi pengeluaran dan transfer. Periksa filter akun di Riwayat, transaksi transfer beserta fee, dan tipe akun kartu kredit. Jika titik awalnya keliru, edit saldo awal; gunakan Reset hanya jika seluruh riwayat akun memang ingin dibersihkan.",
      en: "Balance is calculated from the starting balance plus income, minus expenses and transfers. Check the account filter in Transactions, transfer fees, and credit-card account behavior. Edit the starting balance if the baseline is wrong; use Reset only when you intend to clear that account's history."
    },
    suggestions: {
      id: ["Cara edit saldo awal", "Cara lihat transaksi akun"],
      en: ["How do I edit the starting balance?", "How do I view account transactions?"]
    },
    action: { view: "history", label: { id: "Periksa riwayat", en: "Review transactions" } }
  },
  {
    id: "categories",
    keywords: ["kategori", "category", "hapus kategori", "delete category", "kategori sistem", "system category", "custom category"],
    answer: {
      id: "Kategori bawaan sistem dapat diedit tetapi tidak dapat dihapus. Kategori buatan pengguna dapat diedit dan dihapus. Saat kategori custom dihapus, transaksi tetap tersimpan dan berubah menjadi Tanpa kategori.",
      en: "System categories can be edited but cannot be deleted. User-created categories can be edited and deleted. When a custom category is deleted, its transactions remain and become Uncategorized."
    },
    suggestions: {
      id: ["Cara membuat budget", "Cara tambah transaksi"],
      en: ["How do I create a budget?", "How do I add a transaction?"]
    },
    action: { view: "manage", label: { id: "Kelola kategori", en: "Manage categories" } }
  },
  {
    id: "budgets",
    keywords: ["cara budget", "buat budget", "atur budget", "anggaran", "create budget", "set budget", "manage budget", "budget feature"],
    answer: {
      id: "Buka Atur lalu Budget. Pilih kategori, bulan, tahun, dan batas nominal. Pengeluaran pada kategori dan periode tersebut akan otomatis mengurangi sisa budget dan memunculkan peringatan saat penggunaannya tinggi.",
      en: "Open Settings and select Budgets. Choose a category, month, year, and spending limit. Expenses in that category and period automatically reduce the remaining budget and trigger warnings when usage becomes high."
    },
    suggestions: {
      id: ["Budget mana yang hampir habis?", "Bagaimana kategori bekerja?"],
      en: ["Which budget is almost used up?", "How do categories work?"]
    },
    action: { view: "manage", label: { id: "Buka Budget", en: "Open Budgets" } }
  },
  {
    id: "schedules",
    keywords: ["jadwal", "pengingat", "reminder", "schedule", "jatuh tempo", "due date", "notifikasi jadwal"],
    answer: {
      id: "Buka Atur lalu Jadwal untuk membuat transaksi, transfer, atau top up rutin. Isi tanggal berikutnya, nominal, akun, dan catatan. Saat pengingat ditekan, aplikasi membuka alur yang relevan agar transaksi dapat dikonfirmasi.",
      en: "Open Settings and select Schedules to create recurring transactions, transfers, or top-ups. Set the next date, amount, account, and notes. Selecting a reminder opens the relevant flow so you can confirm the transaction."
    },
    suggestions: {
      id: ["Kenapa notifikasi tidak muncul?", "Ada tagihan terdekat?"],
      en: ["Why are notifications not appearing?", "Any bills due soon?"]
    },
    action: { view: "manage", label: { id: "Kelola jadwal", en: "Manage schedules" } }
  },
  {
    id: "notifications",
    keywords: ["notifikasi tidak", "notif tidak", "push notification", "notification not", "not receiving notification", "izin notifikasi"],
    answer: {
      id: "Pastikan notifikasi diaktifkan dari ikon lonceng, izin browser tidak diblokir, dan aplikasi dibuka melalui HTTPS atau localhost. Untuk pengalaman paling stabil, instal PWA lalu izinkan notifikasi. Jika izin pernah ditolak, ubah izin situs dari pengaturan browser atau sistem.",
      en: "Enable notifications from the bell icon, make sure browser permission is not blocked, and use the app over HTTPS or localhost. For the most reliable experience, install the PWA and allow notifications. If permission was denied, change the site's permission in browser or system settings."
    },
    suggestions: {
      id: ["Cara install aplikasi?", "Cara membuat jadwal?"],
      en: ["How do I install the app?", "How do I create a schedule?"]
    }
  },
  {
    id: "pwa",
    keywords: ["install aplikasi", "download aplikasi", "pwa", "pasang aplikasi", "install app", "download app", "add to home screen"],
    answer: {
      id: "Di Android, buka menu browser lalu pilih Instal aplikasi atau Tambahkan ke layar utama. Di iPhone Safari, tekan Bagikan lalu Add to Home Screen. PWA memerlukan situs HTTPS saat sudah dideploy.",
      en: "On Android, open the browser menu and select Install app or Add to Home screen. On iPhone Safari, select Share, then Add to Home Screen. A deployed PWA requires HTTPS."
    },
    suggestions: {
      id: ["Kenapa notifikasi tidak muncul?", "Bagaimana logout?"],
      en: ["Why are notifications not appearing?", "How do I sign out?"]
    },
    action: { view: "profile", label: { id: "Buka profil", en: "Open Profile" } }
  },
  {
    id: "social",
    keywords: ["tambah teman", "grup keuangan", "split bill", "dompet bersama", "shared wallet", "add friend", "financial group", "request money"],
    answer: {
      id: "Menu Sosial digunakan untuk menambah teman, membuat grup, split bill, request money, dan dompet bersama. Teman tidak dapat melihat saldo, akun, budget, atau transaksi pribadi kecuali transaksi tersebut memang melibatkan mereka.",
      en: "Social lets you add friends, create groups, split bills, request money, and use shared wallets. Friends cannot see your balances, accounts, budgets, or private transactions unless a transaction explicitly involves them."
    },
    suggestions: {
      id: ["Cara tambah teman?", "Bagaimana dompet bersama bekerja?"],
      en: ["How do I add a friend?", "How do shared wallets work?"]
    },
    action: { view: "social", label: { id: "Buka Sosial", en: "Open Social" } }
  },
  {
    id: "session",
    keywords: ["session", "sesi berakhir", "token", "unauthorized", "login ulang", "logged out", "sign in again"],
    answer: {
      id: "Sesi tetap aktif selama aplikasi digunakan dan baru berakhir setelah tidak aktif lebih dari tiga hari, token dicabut, atau Anda logout. Jika sesi berakhir, aplikasi menampilkan pemberitahuan lalu mengarahkan ke halaman login.",
      en: "Your session stays active while you use the app and ends after more than three days of inactivity, token revocation, or sign-out. When it ends, the app shows a notice and redirects you to sign in."
    },
    suggestions: {
      id: ["Bagaimana logout?", "Kenapa login gagal?"],
      en: ["How do I sign out?", "Why can't I sign in?"]
    },
    action: { view: "profile", label: { id: "Buka profil", en: "Open Profile" } }
  }
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function answerProductKnowledge(
  question: string,
  language: ProductLanguage
): ProductKnowledgeReply | null {
  const normalized = normalize(question);
  const helpIntent = [
    "cara", "bagaimana", "gimana", "kenapa", "mengapa", "tidak bisa", "gagal", "error", "fitur",
    "apa itu", "dimana", "di mana", "how", "why", "cannot", "can't", "failed", "feature", "where"
  ].some((phrase) => normalized.includes(normalize(phrase)));
  if (!helpIntent) return null;

  const ranked = topics
    .map((topic) => ({
      topic,
      score: topic.keywords.reduce((total, keyword) => {
        const normalizedKeyword = normalize(keyword);
        if (normalized.includes(normalizedKeyword)) return total + Math.max(normalizedKeyword.split(" ").length, 1) * 3;
        return total + normalizedKeyword.split(" ").filter((word) => word.length > 3 && normalized.includes(word)).length;
      }, 0)
    }))
    .sort((a, b) => b.score - a.score);

  const match = ranked[0];
  if (!match || match.score < 2) return null;
  return {
    answer: match.topic.answer[language],
    disclaimer: null,
    tone: "neutral",
    suggestions: match.topic.suggestions[language],
    actions: match.topic.action ? [{
      view: match.topic.action.view,
      label: match.topic.action.label[language]
    }] : undefined
  };
}
