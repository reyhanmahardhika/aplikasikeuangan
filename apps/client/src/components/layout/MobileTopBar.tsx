/* Generated from App.tsx. Review before commit. */

import type { Session } from "../../lib/api";
import type { AppLanguage } from "../../types/app";
import { Bell, UserRound, Wallet } from "lucide-react";
import { APP_TIME_ZONE } from "../../lib/format";

export function MobileTopBar({ user, language, unreadCount, onLanguageChange, onNotifications, onProfile }: {
    user: Session["user"];
    language: AppLanguage;
    unreadCount: number;
    onLanguageChange: (language: AppLanguage) => void;
    onNotifications: () => void;
    onProfile: () => void;
}) {
    return (<header className="sticky top-0 z-20 border-b border-[#DFE5DE]/80 bg-[#F4F6F2]/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="brand-mark h-10 w-10 shrink-0">
            <Wallet size={18} strokeWidth={2.5}/>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold leading-tight tracking-[-0.025em]">{greetingLabel(language)}, {user.nickname || user.fullName}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{todayLabel(language)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden h-9 items-center rounded-xl border border-[#DFE5DE] bg-white p-0.5 min-[390px]:flex" role="group" aria-label="Language">
            {(["en", "id"] as const).map((item) => (<button key={item} type="button" className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[9px] font-semibold uppercase transition ${language === item ? "bg-[#16A34A] text-white" : "text-slate-400 hover:bg-slate-50"}`} aria-pressed={language === item} onClick={() => onLanguageChange(item)}>
                {item}
              </button>))}
          </div>
          <button className="mobile-icon-btn" aria-label={language === "en" ? "Notifications" : "Notifikasi"} title={language === "en" ? "Notifications" : "Notifikasi"} aria-expanded={undefined} onClick={onNotifications}>
            <Bell size={18}/>
            {unreadCount > 0 && <NotificationBadge count={unreadCount}/>}
          </button>
          <button className="mobile-avatar-btn" aria-label="Profil" title="Profil" onClick={onProfile}>
            {user.avatarUrl ? (<img className="h-full w-full rounded-full object-cover" src={user.avatarUrl} alt=""/>) : (<UserRound size={18}/>)}
          </button>
        </div>
      </div>
    </header>);
}

export function NotificationBadge({ count }: {
    count: number;
}) {
    return (<span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-white">
      {count > 9 ? "9+" : count}
    </span>);
}

function greetingLabel(language: AppLanguage) {
    const hour = Number(new Intl.DateTimeFormat("en-US", {
        timeZone: APP_TIME_ZONE,
        hour: "2-digit",
        hourCycle: "h23"
    }).format(new Date()));
    if (language === "en") {
        if (hour < 11)
            return "Good morning";
        if (hour < 15)
            return "Good afternoon";
        return "Good evening";
    }
    if (hour < 11)
        return "Selamat pagi";
    if (hour < 15)
        return "Selamat siang";
    if (hour < 18)
        return "Selamat sore";
    return "Selamat malam";
}

function todayLabel(language: AppLanguage) {
    return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "id-ID", {
        timeZone: APP_TIME_ZONE,
        weekday: "short",
        day: "numeric",
        month: "short"
    }).format(new Date());
}
