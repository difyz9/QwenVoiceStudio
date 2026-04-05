"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { fetchBackendJson } from "@/lib/backend-client";

type TaskSummary = {
  task_code: string;
  task_type: string;
  title: string;
  detail: string;
  status: string;
  error_message: string | null;
  created_at: string;
  output_path: string | null;
  action_path: string | null;
};

type TaskDetail = TaskSummary & {
  source_code: string;
  source_name: string;
  input_payload: Record<string, unknown> | null;
  instruct: string | null;
  reference_text: string | null;
};

const statusLabelMap: Record<string, string> = {
  missing: "未生成",
  generating: "生成中",
  failed: "失败",
  ready: "已就绪",
  running: "运行中",
  completed: "已完成",
};

const statusClassMap: Record<string, string> = {
  missing: "bg-slate-200 text-slate-700",
  generating: "bg-amber-100 text-amber-900",
  failed: "bg-rose-100 text-rose-700",
  ready: "bg-emerald-100 text-emerald-700",
  running: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export function TaskCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [retryingTaskCode, setRetryingTaskCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "preset_reference_audio" | "synthesis">("all");
  const selectedTaskCode = searchParams.get("task") ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        const payload = await fetchBackendJson<TaskSummary[]>("/api/backend/v1/tasks?limit=100");
        if (!cancelled) {
          startTransition(() => {
            setTasks(payload);
            setError(null);
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "任务列表加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    const intervalId = window.setInterval(() => {
      if (cancelled) {
        return;
      }
      void loadTasks();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTaskDetail(taskCode: string) {
      setIsDetailLoading(true);
      try {
        const payload = await fetchBackendJson<TaskDetail>(`/api/backend/v1/tasks/${encodeURIComponent(taskCode)}`);
        if (!cancelled) {
          setSelectedTask(payload);
          setDetailError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setSelectedTask(null);
          setDetailError(loadError instanceof Error ? loadError.message : "任务详情加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    }

    if (!selectedTaskCode) {
      setSelectedTask(null);
      setDetailError(null);
      setIsDetailLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void loadTaskDetail(selectedTaskCode);

    return () => {
      cancelled = true;
    };
  }, [selectedTaskCode]);

  const filteredTasks = useMemo(() => {
    return filter === "all" ? tasks : tasks.filter((task) => task.task_type === filter);
  }, [filter, tasks]);

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      running: tasks.filter((task) => ["generating", "running"].includes(task.status)).length,
      failed: tasks.filter((task) => task.status === "failed").length,
      done: tasks.filter((task) => ["ready", "completed"].includes(task.status)).length,
    };
  }, [tasks]);

  const selectedTaskOutputFiles = useMemo(() => {
    const outputFiles = selectedTask?.input_payload?.output_files;
    return Array.isArray(outputFiles) ? outputFiles.filter((item): item is string => typeof item === "string") : [];
  }, [selectedTask]);

  const selectedTaskTexts = useMemo(() => {
    const texts = selectedTask?.input_payload?.texts;
    return Array.isArray(texts) ? texts.filter((item): item is string => typeof item === "string") : [];
  }, [selectedTask]);

  function openTask(taskCode: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("task", taskCode);
    router.replace(`/tasks?${nextParams.toString()}`);
  }

  function closeTask() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("task");
    router.replace(nextParams.toString() ? `/tasks?${nextParams.toString()}` : "/tasks");
  }

  async function retryTask(taskCode: string) {
    setError(null);
    setDetailError(null);
    setRetryingTaskCode(taskCode);

    try {
      const payload = await fetchBackendJson<TaskDetail>(`/api/backend/v1/tasks/${encodeURIComponent(taskCode)}/retry`, {
        method: "POST",
      });

      setTasks((current) => {
        const next = [payload, ...current.filter((item) => item.task_code !== taskCode && item.task_code !== payload.task_code)];
        next.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
        return next;
      });

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("task", payload.task_code);
      router.replace(`/tasks?${nextParams.toString()}`);
      setSelectedTask(payload);
    } catch (retryError) {
      const message = retryError instanceof Error ? retryError.message : "任务重试失败。";
      if (selectedTaskCode === taskCode) {
        setDetailError(message);
      } else {
        setError(message);
      }
    } finally {
      setRetryingTaskCode(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "总任务数", value: String(summary.total) },
          { label: "进行中", value: String(summary.running) },
          { label: "失败", value: String(summary.failed) },
          { label: "已完成", value: String(summary.done) },
        ].map((item) => (
          <article key={item.label} className="rounded-[28px] border border-border bg-panel px-6 py-5 shadow-[0_18px_46px_rgba(24,34,48,0.06)]">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
            <div className="mt-4 text-3xl font-semibold tracking-tight text-panel-strong">{item.value}</div>
          </article>
        ))}
      </section>

      <section className="rounded-[32px] border border-border bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Task Center</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-panel-strong">统一任务视图</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              这里聚合参考音频生成和语音合成任务，作为后续独立 worker 与队列系统的承接页。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "全部", value: "all" },
              { label: "参考音频", value: "preset_reference_audio" },
              { label: "语音合成", value: "synthesis" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value as typeof filter)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === option.value ? "bg-panel-strong text-white" : "bg-[#f2e8d9] text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {isLoading ? <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">正在同步任务列表...</div> : null}

        {!isLoading && !error && filteredTasks.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-border bg-[#fffcf7] px-5 py-6 text-sm leading-7 text-slate-500">
            当前筛选条件下还没有任务记录。
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <article
                key={task.task_code}
                className={`rounded-[28px] border p-5 transition ${
                  selectedTaskCode === task.task_code ? "border-panel-strong bg-[#f8f1e6]" : "border-border bg-[#fffcf7]"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{task.task_type}</div>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-panel-strong">{task.title}</h3>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{task.detail}</div>
                    <div className="mt-2 text-xs text-slate-500">创建时间：{new Date(task.created_at).toLocaleString()}</div>
                  </div>

                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClassMap[task.status] ?? "bg-slate-200 text-slate-700"}`}>
                    {statusLabelMap[task.status] ?? task.status}
                  </span>
                </div>

                {task.output_path ? (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs leading-6 text-slate-600 break-all">
                    输出路径：{task.output_path}
                  </div>
                ) : null}

                {task.error_message ? (
                  <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-700">{task.error_message}</div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openTask(task.task_code)}
                    className="inline-flex rounded-full bg-panel-strong px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    查看详情
                  </button>
                  {task.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => void retryTask(task.task_code)}
                      disabled={retryingTaskCode === task.task_code}
                      className="inline-flex rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {retryingTaskCode === task.task_code ? "重试中..." : "重试任务"}
                    </button>
                  ) : null}
                  {task.action_path ? (
                    <Link href={task.action_path} className="inline-flex rounded-full bg-panel-strong px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                      打开相关页面
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-[28px] border border-border bg-[#fffcf7] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Task Detail</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-panel-strong">任务详情</h3>
              </div>
              {selectedTaskCode ? (
                <button type="button" onClick={closeTask} className="rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100">
                  关闭
                </button>
              ) : null}
            </div>

            {isDetailLoading ? <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">正在读取任务详情...</div> : null}
            {detailError ? <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{detailError}</div> : null}

            {!selectedTaskCode && !isDetailLoading ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-border bg-white px-4 py-5 text-sm leading-7 text-slate-500">
                从左侧列表选择一个任务，可以查看输入参数、文本内容、输出路径和失败原因。
              </div>
            ) : null}

            {selectedTask ? (
              <div className="mt-5 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">任务编号</div>
                  <div className="mt-2 break-all text-sm text-slate-700">{selectedTask.task_code}</div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">来源对象</div>
                  <div className="mt-2 text-base font-medium text-panel-strong">{selectedTask.source_name}</div>
                  <div className="mt-1 text-sm text-slate-500">{selectedTask.source_code}</div>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">状态摘要</div>
                  <div className="mt-2">{selectedTask.detail}</div>
                  <div className="mt-2 text-xs text-slate-500">创建时间：{new Date(selectedTask.created_at).toLocaleString()}</div>
                </div>

                {selectedTask.instruct ? (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">设计文案</div>
                    <div className="mt-2">{selectedTask.instruct}</div>
                  </div>
                ) : null}

                {selectedTask.reference_text ? (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">参考文本</div>
                    <div className="mt-2">{selectedTask.reference_text}</div>
                  </div>
                ) : null}

                {selectedTaskTexts.length > 0 ? (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">输入文本</div>
                    <div className="mt-2 space-y-2">
                      {selectedTaskTexts.map((text, index) => (
                        <div key={`${selectedTask.task_code}-${index}`} className="rounded-2xl bg-[#fffcf7] px-3 py-2">
                          {text}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedTask.output_path ? (
                  <div className="rounded-2xl bg-white px-4 py-4 text-xs leading-6 text-slate-600 break-all">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">主输出路径</div>
                    <div className="mt-2">{selectedTask.output_path}</div>
                  </div>
                ) : null}

                {selectedTaskOutputFiles.length > 0 ? (
                  <div className="rounded-2xl bg-white px-4 py-4 text-xs leading-6 text-slate-600">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">输出文件</div>
                    <div className="mt-2 space-y-1 break-all">
                      {selectedTaskOutputFiles.map((file) => (
                        <div key={file}>{file}</div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedTask.error_message ? (
                  <div className="rounded-2xl bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-700">{selectedTask.error_message}</div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  {selectedTask.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => void retryTask(selectedTask.task_code)}
                      disabled={retryingTaskCode === selectedTask.task_code}
                      className="inline-flex rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {retryingTaskCode === selectedTask.task_code ? "重试中..." : "重试当前任务"}
                    </button>
                  ) : null}

                  {selectedTask.action_path ? (
                    <Link href={selectedTask.action_path} className="inline-flex rounded-full bg-panel-strong px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                      打开相关页面
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}