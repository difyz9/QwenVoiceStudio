"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { navigationItems } from "@/lib/navigation";

export function DashboardFrame({ children, currentUser }: { children: ReactNode; currentUser: string | null }) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-screen text-panel-strong">
      <aside className="surface-panel-strong relative hidden w-[21.5rem] shrink-0 overflow-hidden px-6 py-7 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-x-6 top-24 h-px bg-gradient-to-r from-white/0 via-white/18 to-white/0" />
        <div className="pointer-events-none absolute -right-16 top-14 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(239,210,177,0.22),rgba(239,210,177,0))]" />
        <div>
          <div className="eyebrow-chip border-white/10 bg-white/8 text-white/76 before:bg-[linear-gradient(180deg,#f0c796,#a95c2c)]">Qwen Voice Studio</div>
          <div className="display-font mt-6 text-4xl font-semibold leading-tight tracking-tight text-white">语音资产与生产指挥台</div>
          <p className="mt-4 text-sm leading-7 text-white/68">
            统一管理音色设计、内置音色库、语音合成与批量任务生产流程。
          </p>
        </div>

        <nav className="mt-10 flex flex-1 flex-col gap-2.5">
          {navigationItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-[1.4rem] px-4 py-3.5 text-sm font-medium transition ${
                  active
                    ? "bg-[linear-gradient(180deg,#fff8ef,#f2e0ca)] text-slate-950 shadow-[0_18px_34px_rgba(8,18,30,0.16)] ring-1 ring-black/6"
                    : "text-white/78 hover:bg-white/8 hover:text-white"
                }`}
              >
                <div className={active ? "display-font text-lg font-semibold text-slate-950" : "text-[0.98rem] font-semibold"}>{item.label}</div>
                <div className={`mt-1 text-xs font-normal ${active ? "text-slate-700" : "text-white/45"}`}>
                  {item.description}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-4 text-sm text-white/78 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Runtime</div>
          <div className="mt-2 text-base font-semibold text-white">Next.js + FastAPI + PostgreSQL</div>
          <div className="mt-3 text-xs text-white/55">当前登录：{currentUser ?? "未识别"}</div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-white/35 bg-[rgba(251,246,237,0.76)] px-5 py-4 backdrop-blur-xl lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="section-kicker">Management Panel</div>
              <div className="display-font mt-1 text-3xl font-semibold tracking-tight">语音设计与合成后台</div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-full border border-black/6 bg-white/82 px-4 py-2 text-sm text-slate-600 shadow-[0_12px_24px_rgba(77,52,25,0.06)]">
                当前账号：{currentUser ?? "未识别"}
              </div>
              <LogoutButton />
            </div>
          </div>

          <nav className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:hidden">
            {navigationItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-w-fit rounded-full px-4 py-2 text-sm font-medium transition ${
                    active ? "bg-panel-strong text-white shadow-[0_14px_24px_rgba(23,33,45,0.22)]" : "bg-white/82 text-slate-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}