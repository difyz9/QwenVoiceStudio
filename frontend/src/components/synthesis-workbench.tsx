"use client";

import { startTransition, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { fetchBackendJson } from "@/lib/backend-client";

type VoicePreset = {
  id: number;
  preset_code: string;
  name: string;
  language: string;
  reference_audio_path: string | null;
  instruct: string;
};

type SynthesisJob = {
  id: number;
  job_code: string;
  preset_code: string;
  status: string;
  merged_audio_path: string | null;
  error_message: string | null;
  created_at: string;
  input_payload: {
    texts?: string[];
    language?: string;
    output_files?: string[];
    pause_ms?: number;
  };
};

export function SynthesisWorkbench() {
  const searchParams = useSearchParams();
  const [presets, setPresets] = useState<VoicePreset[]>([]);
  const [jobs, setJobs] = useState<SynthesisJob[]>([]);
  const [presetCode, setPresetCode] = useState("");
  const [language, setLanguage] = useState("");
  const [textBlock, setTextBlock] = useState("欢迎使用 Qwen Voice Studio。\n这是一条来自预置音色的批量合成演示。");
  const [mergeOutput, setMergeOutput] = useState(true);
  const [pauseMs, setPauseMs] = useState(300);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [presetPayload, jobPayload] = await Promise.all([
          fetchBackendJson<VoicePreset[]>("/api/backend/v1/presets"),
          fetchBackendJson<SynthesisJob[]>("/api/backend/v1/synthesis/jobs"),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setPresets(presetPayload);
          setJobs(jobPayload);
          const preferredPresetCode = searchParams.get("preset") ?? "";
          const preferredPreset = presetPayload.find((preset) => preset.preset_code === preferredPresetCode);
          const fallbackPreset = preferredPreset ?? presetPayload[0] ?? null;
          setPresetCode((current) => current || fallbackPreset?.preset_code || "");
          setLanguage((current) => current || fallbackPreset?.language || "");
          setError(null);
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "任务台初始化失败，请检查登录状态或后端服务。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const texts = textBlock
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!presetCode) {
      setError("请先选择一个预置音色。");
      return;
    }

    if (texts.length === 0) {
      setError("请至少输入一行待合成文本。");
      return;
    }

    setIsSubmitting(true);
    try {
      const job = await fetchBackendJson<SynthesisJob>("/api/backend/v1/synthesis/jobs", {
        method: "POST",
        body: JSON.stringify({
          preset_code: presetCode,
          texts,
          language: language.trim() || undefined,
          merge_output: mergeOutput,
          pause_ms: pauseMs,
        }),
      });
      startTransition(() => {
        setJobs((current) => [job, ...current].slice(0, 10));
        setNotice(`任务 ${job.job_code} 已完成，输出目录已写入服务器。`);
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "任务提交失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedPreset = presets.find((preset) => preset.preset_code === presetCode) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <section className="rounded-[32px] border border-border bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Batch Console</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-panel-strong">批量合成表单</h2>
          </div>
          <div className="text-sm text-slate-500">多行文本按行拆分，逐条生成 `line_XX.wav`。</div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {isLoading ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">正在同步音色与任务列表...</div> : null}
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">预置音色</div>
            <select
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
              value={presetCode}
              onChange={(event) => {
                const nextPresetCode = event.target.value;
                setPresetCode(nextPresetCode);
                const nextPreset = presets.find((preset) => preset.preset_code === nextPresetCode);
                if (nextPreset) {
                  setLanguage(nextPreset.language);
                }
              }}
            >
              <option value="">请选择预置音色</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.preset_code}>
                  {preset.name} ({preset.preset_code})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">语言标签</div>
              <input
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder="Chinese"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">停顿时长（ms）</div>
              <input
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
                type="number"
                min={0}
                max={5000}
                value={pauseMs}
                onChange={(event) => setPauseMs(Number(event.target.value) || 0)}
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">待合成文本</div>
            <textarea
              className="min-h-52 w-full rounded-[28px] border border-border bg-white px-4 py-4 text-sm leading-7 outline-none transition focus:border-accent"
              value={textBlock}
              onChange={(event) => setTextBlock(event.target.value)}
              placeholder="每行一条文本，提交后会批量生成音频。"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl bg-[#f7f2e8] px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={mergeOutput} onChange={(event) => setMergeOutput(event.target.checked)} />
            额外生成一个合并后的 `final.wav`
          </label>

          {selectedPreset ? (
            <div className="rounded-[28px] border border-border bg-[#fffcf7] px-5 py-5 text-sm leading-7 text-slate-600">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">当前音色说明</div>
              <div className="mt-2 text-base font-medium text-panel-strong">{selectedPreset.name}</div>
              <p className="mt-3">{selectedPreset.instruct}</p>
              <div className="mt-3 text-xs text-slate-500">
                参考音频：{selectedPreset.reference_audio_path ? "已就绪" : "未生成，请先回到音色库点击“生成参考音频”。"}
              </div>
            </div>
          ) : null}

          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {notice ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

          <button
            type="submit"
            disabled={isSubmitting || !selectedPreset?.reference_audio_path}
            className="flex w-full items-center justify-center rounded-2xl bg-panel-strong px-4 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "合成中..." : selectedPreset?.reference_audio_path ? "提交合成任务" : "请先生成参考音频"}
          </button>
        </form>
      </section>

      <section className="rounded-[32px] border border-border bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Recent Jobs</div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-panel-strong">最近任务</h2>
        <div className="mt-6 space-y-4">
          {jobs.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-border bg-[#fffcf7] px-5 py-6 text-sm leading-7 text-slate-500">
              还没有任务记录。提交一次批量合成后，这里会展示输出路径和失败原因。
            </div>
          ) : null}

          {jobs.map((job) => (
            <article key={job.id} className="rounded-[28px] border border-border bg-[#fffcf7] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{job.job_code}</div>
                  <h3 className="mt-2 text-lg font-semibold text-panel-strong">{job.preset_code}</h3>
                </div>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-amber-950">{job.status}</span>
              </div>
              <div className="mt-4 text-sm leading-7 text-slate-600">
                共 {job.input_payload.texts?.length ?? 0} 条文本，语言 {job.input_payload.language ?? "--"}
              </div>
              <div className="mt-2 text-xs leading-6 text-slate-500">创建时间：{new Date(job.created_at).toLocaleString()}</div>
              {job.merged_audio_path ? (
                <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-xs leading-6 text-slate-600 break-all">
                  合并音频：{job.merged_audio_path}
                </div>
              ) : null}
              {job.input_payload.output_files?.length ? (
                <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-xs leading-6 text-slate-600">
                  单条输出：{job.input_payload.output_files.length} 个文件
                </div>
              ) : null}
              {job.error_message ? (
                <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-700">{job.error_message}</div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}