"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { navigationItems } from "@/lib/navigation";

export function DashboardFrame({ children, currentUser }: { children: ReactNode; currentUser: string | null }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#e9e4d8] text-panel-strong">
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-panel-strong px-6 py-7 text-white lg:flex lg:flex-col">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-white/55">Qwen Voice Studio</div>
          <div className="mt-3 text-2xl font-semibold tracking-tight">专业语音控制台</div>
          <p className="mt-4 text-sm leading-7 text-white/70">
            统一管理音色设计、内置音色库、语音合成与批量任务生产流程。
          </p>
        </div>

        <nav className="mt-10 flex flex-1 flex-col gap-2">
          {navigationItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-[#f8efe2] text-slate-950 shadow-[0_18px_34px_rgba(8,18,30,0.16)] ring-1 ring-black/6"
                    : "text-white/78 hover:bg-white/8 hover:text-white"
                }`}
              >
                <div className={active ? "text-base font-semibold text-slate-950" : undefined}>{item.label}</div>
                <div className={`mt-1 text-xs font-normal ${active ? "text-slate-700" : "text-white/45"}`}>
                  {item.description}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm text-white/78">
          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Runtime</div>
          <div className="mt-2 text-base font-semibold text-white">Next.js + FastAPI + PostgreSQL</div>
          <div className="mt-3 text-xs text-white/55">当前登录：{currentUser ?? "未识别"}</div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-black/6 bg-white/72 px-5 py-4 backdrop-blur-sm lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Management Panel</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">语音设计与合成后台</div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-black/6 bg-white px-4 py-2 text-sm text-slate-600">
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
                    active ? "bg-panel-strong text-white" : "bg-white text-slate-600"
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