/* Generated from App.tsx. Review before commit. */

import type { AppLanguage, HeaderNotification } from "../../types/app";
import { Bell, CheckCircle2 } from "lucide-react";
import { localDate } from "../../lib/format";

export function NotificationCenter({ language, items, pushStatus, onClose, onEnablePush, onMarkAllRead, onOpen }: {
    language: AppLanguage;
    items: HeaderNotification[];
    pushStatus: "unsupported" | "unavailable" | "default" | "granted" | "denied";
    onClose?: () => void;
    onEnablePush: () => void;
    onMarkAllRead: () => void;
    onOpen: (item: HeaderNotification) => void;
}) {
    const isEnglish = language === "en";
    const pushCopy = {
        granted: isEnglish ? "Push notifications active" : "Push notification aktif",
        denied: isEnglish ? "Notifications blocked in device settings" : "Notifikasi diblokir di pengaturan perangkat",
        unsupported: isEnglish ? "Push is not supported on this device" : "Push belum didukung perangkat ini",
        unavailable: isEnglish ? "Push server is not configured" : "Server push belum dikonfigurasi",
        default: isEnglish ? "Get reminders even when the app is closed" : "Dapatkan pengingat saat aplikasi ditutup"
    }[pushStatus];
    return (<section className="mx-auto max-w-3xl space-y-3">
      <div className="overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-soft lg:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">{isEnglish ? "Notifications" : "Notifikasi"}</p>
            <p className="text-[11px] text-slate-500">
              {items.some((item) => !item.isRead)
            ? `${items.filter((item) => !item.isRead).length} ${isEnglish ? "need attention" : "perlu diperhatikan"}`
            : isEnglish ? "You're all caught up" : "Semua sudah dibaca"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {items.some((item) => !item.isRead) && (<button type="button" className="rounded-lg px-2.5 py-2 text-[11px] font-semibold text-[#16A34A] hover:bg-emerald-50" onClick={onMarkAllRead}>
                {isEnglish ? "Mark all read" : "Tandai dibaca"}
              </button>)}
          </div>
        </div>

        <div className="border-b border-slate-100 bg-[#F8FAFC] p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${pushStatus === "granted" ? "bg-emerald-50 text-[#16A34A]" : "bg-slate-100 text-slate-500"}`}>
              <Bell size={17}/>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800">{pushCopy}</p>
              {pushStatus === "default" && <p className="mt-0.5 text-[10px] text-slate-500">{isEnglish ? "Schedules, requests, and shared payments." : "Jadwal, permintaan, dan pembayaran bersama."}</p>}
            </div>
            {pushStatus === "default" && (<button type="button" className="shrink-0 rounded-lg bg-[#16A34A] px-3 py-2 text-[11px] font-semibold text-white" onClick={onEnablePush}>
                {isEnglish ? "Enable" : "Aktifkan"}
              </button>)}
          </div>
        </div>

        <div className="p-2">
          {items.length === 0 ? (<div className="px-4 py-10 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-[#16A34A]"><CheckCircle2 size={20}/></span>
              <p className="mt-3 text-sm font-semibold text-slate-800">{isEnglish ? "No new notifications" : "Belum ada notifikasi baru"}</p>
              <p className="mt-1 text-xs text-slate-500">{isEnglish ? "Important activity will appear here." : "Aktivitas penting akan muncul di sini."}</p>
            </div>) : items.map((item) => (<button type="button" key={`${item.kind ?? "social"}-${item.id}`} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${item.isRead ? "" : "bg-emerald-50/70"}`} onClick={() => onOpen(item)}>
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.kind === "schedule" ? "bg-amber-50 text-amber-700" : "bg-white text-[#16A34A]"}`}>
                <Bell size={16}/>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{item.title}</span>
                  {!item.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#16A34A]"/>}
                </span>
                {item.body && <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-slate-500">{item.body}</span>}
                <span className="mt-1 block text-[10px] text-slate-400">{localDate(item.createdAt)}</span>
              </span>
            </button>))}
        </div>
      </div>
    </section>);
}
