import { TaskCenter } from "@/components/task-center";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Tasks</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-panel-strong">任务中心</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          统一查看参考音频生成和语音合成任务。当前版本先做聚合视图，下一步会继续升级为独立 worker 和统一任务队列。
        </p>
      </section>

      <TaskCenter />
    </div>
  );
}