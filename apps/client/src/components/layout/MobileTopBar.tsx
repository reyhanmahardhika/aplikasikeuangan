/* Generated from App.tsx. Review before commit. */

import type { Session } from "../../lib/api";
import type { AppLanguage } from "../../types/app";
import { Bell, UserRound } from "lucide-react";
import { APP_TIME_ZONE } from "../../lib/format";

export function MobileTopBar({ user, language, unreadCount, onLanguageChange, onNotifications, onProfile }: {
    user: Session["user"];
    language: AppLanguage;
    unreadCount: number;
    onLanguageChange: (language: AppLanguage) => void;
    onNotifications: () => void;
    onProfile: () => void;
}) {
    return (<header className="sticky top-0 z-20 bg-[#F8FAFC]/95 px-4 pb-2 pt-4 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 via-violet-500 to-emerald-400 text-sm font-semibold text-white shadow-sm">
            F
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500">{greetingLabel(language)}</p>
            <p className="truncate text-sm font-semibold leading-tight">{user.nickname || user.fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Language">
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
