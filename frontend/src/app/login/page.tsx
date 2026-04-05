import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const sessionExpired = reason === "session-expired";

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.1fr_0.9fr]">
      <section className="grain relative overflow-hidden px-8 py-12 lg:px-14 lg:py-16">
        <div className="mx-auto flex h-full max-w-2xl flex-col justify-between">
          <div>
            <span className="inline-flex rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium tracking-[0.24em] text-panel-strong uppercase">
              Qwen Voice Studio
            </span>
            <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-[1.02] tracking-tight text-panel-strong lg:text-6xl">
              面向专业语音设计与语音合成的统一控制台。
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700 lg:text-lg">
              通过内置音色库、批量任务和可扩展推理服务，统一管理音色设计、语音生成与业务交付流程。
            </p>
          </div>

          <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-3">
            <div className="rounded-3xl border border-black/8 bg-white/72 p-5 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Voice Design</div>
              <div className="mt-3 text-lg font-semibold text-panel-strong">内置音色设计</div>
            </div>
            <div className="rounded-3xl border border-black/8 bg-white/72 p-5 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Speech Ops</div>
              <div className="mt-3 text-lg font-semibold text-panel-strong">批量任务编排</div>
            </div>
            <div className="rounded-3xl border border-black/8 bg-white/72 p-5 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Admin Panel</div>
              <div className="mt-3 text-lg font-semibold text-panel-strong">统一后台管理</div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 lg:px-10">
        <div className="w-full max-w-md rounded-[32px] border border-border bg-panel p-8 shadow-[0_30px_80px_rgba(16,32,48,0.08)] lg:p-10">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Admin Access</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-panel-strong">登录管理后台</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              默认管理员账号已预置，可登录后继续配置音色、批量生成任务与系统参数。
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            默认账号：admin / admin123
          </div>

          {sessionExpired ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              当前登录状态已失效，请重新登录后继续操作。
            </div>
          ) : null}

          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}