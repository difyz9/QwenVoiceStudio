import { TaskCenter } from "@/components/task-center";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <section className="hero-panel p-6 lg:p-8">
        <div className="section-kicker">Tasks</div>
        <h1 className="page-title mt-3 text-panel-strong">任务中心</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          统一查看参考音频生成和语音合成任务。当前版本先做聚合视图，下一步会继续升级为独立 worker 和统一任务队列。
        </p>
      </section>

      <TaskCenter />
    </div>
  );
}