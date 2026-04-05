import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const sessionExpired = reason === "session-expired";

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.08fr_0.92fr]">
      <section className="grain relative overflow-hidden px-8 py-12 lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),rgba(255,255,255,0)_38%),radial-gradient(circle_at_80%_14%,rgba(169,92,44,0.16),rgba(169,92,44,0)_28%)]" />
        <div className="mx-auto flex h-full max-w-2xl flex-col justify-between">
          <div>
            <span className="eyebrow-chip">Qwen Voice Studio</span>
            <h1 className="page-title mt-8 max-w-2xl text-panel-strong">
              面向专业语音设计与语音合成的统一控制台。
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700 lg:text-lg">
              通过内置音色库、批量任务和可扩展推理服务，统一管理音色设计、语音生成与业务交付流程。
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-700">
              {[
                "Preset Direction",
                "Batch Synthesis",
                "Task Orchestration",
              ].map((tag) => (
                <span key={tag} className="rounded-full border border-black/8 bg-white/62 px-4 py-2 backdrop-blur-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-3">
            <div className="surface-panel rounded-[1.9rem] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Voice Design</div>
              <div className="display-font mt-3 text-2xl font-semibold text-panel-strong">内置音色设计</div>
            </div>
            <div className="surface-panel rounded-[1.9rem] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Speech Ops</div>
              <div className="display-font mt-3 text-2xl font-semibold text-panel-strong">批量任务编排</div>
            </div>
            <div className="surface-panel rounded-[1.9rem] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Admin Panel</div>
              <div className="display-font mt-3 text-2xl font-semibold text-panel-strong">统一后台管理</div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 lg:px-10">
        <div className="surface-panel w-full max-w-md rounded-[2rem] p-8 lg:p-10">
          <div>
            <div className="section-kicker">Admin Access</div>
            <h2 className="section-title mt-3 text-panel-strong">登录管理后台</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              默认管理员账号已预置，可登录后继续配置音色、批量生成任务与系统参数。
            </p>
          </div>

          <div className="mt-8 rounded-[1.4rem] border border-amber-300/60 bg-[rgba(245,223,184,0.5)] px-4 py-3 text-sm text-amber-900">
            默认账号：admin / admin123
          </div>

          {sessionExpired ? (
            <div className="mt-4 rounded-[1.4rem] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
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