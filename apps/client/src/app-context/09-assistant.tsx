/**
 * AI context chunk: Finance assistant
 * Generated from: App.tsx
 * Read-only snapshot. Do not import this file into the application.
 */
function AssistantView({
  request,
  language,
  onNavigate,
  context
}: {
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  language: AppLanguage;
  onNavigate: (view: View) => void;
  context?: AssistantContext | null;
}) {
  const relationshipMode = context?.contextType === "relationship_finance";
  const relationshipLabel = context?.label
    ?? (relationshipMode ? (language === "en" ? "Selected relationship" : "Relationship terpilih") : "");
  const relationshipMeta = context?.partnerName
    ? (language === "en" ? `With ${context.partnerName}` : `Dengan ${context.partnerName}`)
    : (relationshipMode ? (language === "en" ? "Relationship Finance context" : "Konteks Relationship Finance") : "");
  const copy = language === "en" ? {
    greeting: "Hi, I can help you make financial decisions using the data recorded in this app.",
    relationshipGreeting: "Hi, I can analyze your shared relationship workspace using only data both of you allowed.",
    header: relationshipMode ? "Relationship Copilot" : "Finance Copilot",
    subheader: relationshipMode ? "Ask about shared goals, cashflow, saving rate, or agreements" : "Ask about affordability, budgets, bills, balances, or shared debt",
    placeholder: "Example: Can I afford shoes for 1 million?",
    send: "Send",
    loading: "Checking your finances...",
    error: "The assistant is temporarily unavailable. Please try again.",
    suggestions: relationshipMode ? [
      "Is our shared finance healthy?",
      "Is our main goal on track?",
      "How much should we save each month?",
      "Which budget should we improve?"
    ] : [
      "Can I afford shoes for 1 million?",
      "Check my finances this month",
      "Any bills due soon?",
      "How do I use the app features?"
    ]
  } : {
    greeting: "Hai, aku bisa membantu mengambil keputusan keuangan berdasarkan data yang tercatat di aplikasi ini.",
    relationshipGreeting: "Hai, aku bisa menganalisis workspace keuangan bersama hanya dari data yang kalian izinkan.",
    header: relationshipMode ? "Kopilot Relationship" : "Kopilot Keuangan",
    subheader: relationshipMode ? "Tanya goal bersama, arus kas, saving rate, atau kesepakatan" : "Tanya kelayakan belanja, budget, tagihan, saldo, atau utang bersama",
    placeholder: "Contoh: Boleh beli sepatu 1 juta?",
    send: "Kirim",
    loading: "Memeriksa kondisi keuangan...",
    error: "Kopilot sedang tidak bisa menjawab. Coba lagi sebentar.",
    suggestions: relationshipMode ? [
      "Apakah keuangan bersama kami sehat?",
      "Apakah target utama masih sesuai jadwal?",
      "Berapa yang harus kami tabung tiap bulan?",
      "Budget mana yang perlu diperbaiki?"
    ] : [
      "Boleh beli sepatu 1 juta?",
      "Cek kondisi keuangan bulan ini",
      "Ada tagihan yang segera jatuh tempo?",
      "Bagaimana cara menggunakan fitur aplikasi?"
    ]
  };
  const initialSuggestions = copy.suggestions;
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      text: relationshipMode ? copy.relationshipGreeting : copy.greeting,
      suggestions: initialSuggestions
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([{
      role: "assistant",
      text: relationshipMode ? copy.relationshipGreeting : copy.greeting,
      suggestions: copy.suggestions
    }]);
  }, [language, relationshipMode, context?.relationshipFinanceId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || loading) return;

    setMessages((current) => [...current, { role: "user", text: message }]);
    setLoading(true);
    try {
      const answer = await request<{
        answer: string;
        disclaimer?: string | null;
        suggestions?: string[];
        tone?: AssistantMessage["tone"];
        highlights?: AssistantMessage["highlights"];
        actions?: AssistantMessage["actions"];
      }>("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message, language, context: context ?? undefined })
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answer.answer,
          disclaimer: answer.disclaimer,
          suggestions: answer.suggestions,
          tone: answer.tone,
          highlights: answer.highlights,
          actions: answer.actions
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: copy.error,
          suggestions: initialSuggestions
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const message = String(data.get("message") ?? "");
    form.reset();
    await sendMessage(message);
  };

  return (
    <section className="mx-auto flex h-full min-h-0 max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-soft lg:h-[calc(100vh-8rem)] lg:rounded-lg lg:border-slate-200">
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 lg:px-5 lg:py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A] lg:rounded-lg">
            <Bot size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight text-slate-950">{copy.header}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">{copy.subheader}</p>
            {relationshipMode && (
              <div className="mt-2 flex min-w-0 items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">
                <HeartPulse size={13} />
                <span className="truncate">{relationshipLabel}</span>
                {relationshipMeta && <span className="hidden text-emerald-700/70 sm:inline">- {relationshipMeta}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-3 py-4 lg:px-5">
        <div className="space-y-3">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const responseTone = message.tone ?? "neutral";
            const responseStyles = {
              positive: "border-emerald-100 bg-emerald-50/50",
              warning: "border-amber-100 bg-amber-50/50",
              danger: "border-rose-100 bg-rose-50/50",
              neutral: "border-slate-100 bg-white"
            };
            const highlightStyles = {
              positive: "bg-emerald-50 text-[#15803D]",
              warning: "bg-amber-50 text-amber-800",
              danger: "bg-rose-50 text-rose-700",
              neutral: "bg-slate-50 text-slate-800"
            };
            return (
              <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`${isUser ? "max-w-[86%] items-end" : "w-full items-start"}`}>
                  <div
                    className={`rounded-[18px] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm lg:rounded-lg ${
                      isUser
                        ? "rounded-br-md bg-[#15803D] text-white"
                        : `rounded-bl-md border text-slate-800 ${responseStyles[responseTone]}`
                    }`}
                  >
                    <p>{message.text}</p>
                    {!isUser && message.highlights && message.highlights.length > 0 && (
                      <div className={`mt-3 grid gap-2 ${message.highlights.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                        {message.highlights.map((highlight) => (
                          <div key={`${highlight.label}-${highlight.value}`} className={`min-w-0 rounded-xl px-2.5 py-2 ${highlightStyles[highlight.tone]}`}>
                            <p className="truncate text-[10px] opacity-70">{highlight.label}</p>
                            <p className="mt-0.5 break-words text-xs font-semibold leading-4">{highlight.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isUser && message.actions && message.actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                          <button
                            key={`${action.view}-${action.label}`}
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#16A34A] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#15803D]"
                            onClick={() => {
                              const allowedViews: View[] = ["manual", "history", "manage", "social", "profile", "dashboard"];
                              if (allowedViews.includes(action.view as View)) onNavigate(action.view as View);
                            }}
                          >
                            {action.label}
                            <ChevronRight size={14} />
                          </button>
                        ))}
                      </div>
                    )}
                    {message.disclaimer && <p className="mt-2 text-[11px] font-semibold opacity-70">{message.disclaimer}</p>}
                  </div>
                  {!isUser && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="rounded-full border border-emerald-100 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#16A34A] shadow-sm transition hover:bg-emerald-50 disabled:opacity-50"
                          onClick={() => sendMessage(suggestion)}
                          disabled={loading}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-[18px] rounded-bl-md border border-emerald-100 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-500 shadow-sm lg:rounded-lg">
                <Loader2 className="animate-spin text-[#16A34A]" size={15} /> {copy.loading}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <form className="shrink-0 border-t border-slate-100 bg-white p-3" onSubmit={submit}>
        <div className="flex items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 lg:rounded-md"
            name="message"
            placeholder={copy.placeholder}
            autoComplete="off"
            disabled={loading}
          />
          <button
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-md"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
            {copy.send}
          </button>
        </div>
      </form>
    </section>
  );
}
