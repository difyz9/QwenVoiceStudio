"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";

import { fetchBackendJson } from "@/lib/backend-client";

type VoicePreset = {
  id: number;
  preset_code: string;
  name: string;
  language: string;
  instruct: string;
  ref_text: string;
  reference_audio_path: string | null;
  reference_audio_status: string;
  reference_audio_error: string | null;
  source_type: string;
};

export function PresetOverview() {
  const [presets, setPresets] = useState<VoicePreset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPresetCode, setExpandedPresetCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPresets(showLoading: boolean) {
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const payload = await fetchBackendJson<VoicePreset[]>("/api/backend/v1/presets");
        if (!cancelled) {
          startTransition(() => {
            setPresets(payload);
            setError(null);
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "预置音色尚未加载完成。\n");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPresets(true);

    const pollInterval = window.setInterval(() => {
      if (cancelled) {
        return;
      }

      setPresets((current) => {
        if (!current.some((preset) => preset.reference_audio_status === "generating")) {
          return current;
        }

        void loadPresets(false);
        return current;
      });
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(pollInterval);
    };
  }, []);

  async function handleMaterialize(presetCode: string) {
    setError(null);
    setNotice(null);

    try {
      const updatedPreset = await fetchBackendJson<VoicePreset>(`/api/backend/v1/presets/${presetCode}/materialize`, {
        method: "POST",
      });

      startTransition(() => {
        setPresets((current) =>
          current.map((preset) => (preset.preset_code === presetCode ? updatedPreset : preset)),
        );
        setExpandedPresetCode(null);
        setNotice(
          updatedPreset.reference_audio_status === "generating"
            ? `已开始生成 ${updatedPreset.name} 的参考音频，刷新页面后也会保持“生成中”状态。`
            : `已根据预置文案生成 ${updatedPreset.name} 的参考音频，现在可以试听并用于语音合成。`,
        );
      });
    } catch (materializeError) {
      setError(materializeError instanceof Error ? materializeError.message : "生成参考音频失败，请稍后重试。");
    }
  }

  return (
    <section className="rounded-[32px] border border-border bg-panel p-6 shadow-[0_24px_60px_rgba(24,34,48,0.08)] lg:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Preset Library</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-panel-strong">系统预置音色</h2>
        </div>
        <div className="text-sm text-slate-500">数据来自 PostgreSQL 初始化种子与后续业务沉淀。</div>
      </div>

      {error ? <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {isLoading ? <div className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">正在读取预置音色列表...</div> : null}

      {!isLoading && !error && presets.some((preset) => preset.reference_audio_status !== "ready") ? (
        <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
          当前部分预置音色还没有进入可试听状态。你可以直接在音色库里发起生成，生成过程中刷新页面也会持续显示状态。Docker CPU 环境下首次生成通常需要 1 到 3 分钟。
        </div>
      ) : null}

      {!isLoading && !error && presets.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-border bg-[#fffcf7] px-5 py-6 text-sm leading-7 text-slate-500">
          当前还没有可展示的音色。先去“音色设计”创建一个 preset，或检查后端初始化种子是否已导入。
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {presets.map((preset) => (
          <article key={preset.id} className="rounded-[28px] border border-border bg-[#fffcf7] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{preset.preset_code}</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-panel-strong">{preset.name}</h3>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-amber-950">{preset.language}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{preset.instruct}</p>
            <div className="mt-5 rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-600">
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-400">参考文本</div>
              {preset.ref_text}
            </div>

            <div className="mt-4 rounded-2xl bg-white px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">参考音频试听</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {preset.reference_audio_status === "ready"
                      ? "参考音频已就绪，可直接播放试听。"
                      : preset.reference_audio_status === "generating"
                        ? "参考音频正在生成中，刷新页面后仍会保留该状态。首次生成通常需要 1 到 3 分钟。"
                        : preset.reference_audio_status === "failed"
                          ? "上次生成失败，可以重新发起。"
                          : "当前缺少参考音频文件，暂时不能试听。"}
                  </div>
                  {preset.reference_audio_error ? (
                    <div className="mt-2 text-xs leading-6 text-rose-600">失败原因：{preset.reference_audio_error}</div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {preset.reference_audio_status === "ready" && preset.reference_audio_path ? (
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedPresetCode((current) =>
                          current === preset.preset_code ? null : preset.preset_code,
                        );
                      }}
                      className="rounded-full bg-panel-strong px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      {expandedPresetCode === preset.preset_code ? "收起试听" : "试听音色"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={preset.reference_audio_status === "generating"}
                      onClick={() => {
                        void handleMaterialize(preset.preset_code);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        preset.reference_audio_status === "failed" ? "bg-rose-600 hover:opacity-92" : "bg-accent hover:opacity-92"
                      }`}
                    >
                      {preset.reference_audio_status === "generating"
                        ? "生成中..."
                        : preset.reference_audio_status === "failed"
                          ? "重新生成"
                          : "生成参考音频"}
                    </button>
                  )}

                  <Link
                    href={`/synthesis?preset=${encodeURIComponent(preset.preset_code)}`}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      preset.reference_audio_status === "ready" && preset.reference_audio_path
                        ? "bg-[#f2e8d9] text-slate-900 hover:bg-[#eadbc4]"
                        : "pointer-events-none bg-slate-200 text-slate-500"
                    }`}
                    aria-disabled={!(preset.reference_audio_status === "ready" && preset.reference_audio_path)}
                  >
                    去合成
                  </Link>
                </div>
              </div>

              {preset.reference_audio_status === "ready" && preset.reference_audio_path && expandedPresetCode === preset.preset_code ? (
                <div className="mt-4">
                  <audio
                    controls
                    preload="none"
                    className="w-full"
                    src={`/api/backend/v1/presets/${preset.preset_code}/reference-audio`}
                  >
                    您的浏览器不支持音频播放。
                  </audio>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}