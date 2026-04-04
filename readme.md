# Qwen3-TTS 本地语音合成指南

本文整理了如何在本地使用 Qwen3-TTS 做语音合成，重点覆盖以下两种常见方式：

- 用 Python 脚本直接合成音频
- 用本地 Web UI 快速体验

同时附带两个可运行案例：

- 基础案例：根据文本 + 声音描述生成语音
- 进阶案例：先设计一个角色音色，再复用这个声音批量生成台词

当前文档以 Qwen 官方模型 `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign` 为核心示例。

模型地址：

- Hugging Face: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign
- 官方仓库: https://github.com/QwenLM/Qwen3-TTS

## 1. 模型说明

Qwen3-TTS 是阿里 Qwen 团队发布的文本转语音模型系列，支持多语言、多情绪和自然语言驱动的音色控制。

常见模型分工：

- `Qwen3-TTS-12Hz-1.7B-VoiceDesign`: 通过自然语言描述声音特征，直接生成目标声音
- `Qwen3-TTS-12Hz-1.7B-CustomVoice`: 使用预置说话人音色并支持风格控制
- `Qwen3-TTS-12Hz-1.7B-Base`: 语音克隆，适合给定参考音频后生成相同说话人的新内容

如果你的目标是“我写一段提示词，让模型自己设计一个声音并说出来”，优先使用 `VoiceDesign`。

## 2. 本地运行建议

### 2.1 推荐环境

官方示例主要围绕 CUDA 环境，推荐配置：

- Python 3.12
- PyTorch
- NVIDIA GPU
- `bfloat16` 或 `float16`
- `flash-attn` 作为可选加速

### 2.2 macOS 说明

你当前是 macOS 环境。需要注意：

- 官方最佳体验是 Linux + NVIDIA CUDA
- 在 macOS 上通常可以尝试 CPU 方式运行，但速度会明显慢很多
- `flash-attn` 通常不适用于 macOS 本地环境
- 如果只是验证流程、做少量样例，CPU 方式是可行的

因此，这份文档的示例脚本同时兼容两种模式：

- 有 CUDA 时自动走 GPU
- 没有 CUDA 时自动回退到 CPU

## 3. 安装方式

### 3.1 创建虚拟环境

推荐使用 conda：

```bash
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts
```

如果你使用 venv：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
```

### 3.2 安装依赖

最简安装：

```bash
pip install -U qwen-tts soundfile
```

如果是 CUDA 机器，建议再安装 FlashAttention 2：

```bash
pip install -U flash-attn --no-build-isolation
```

如果机器内存不大，可以用：

```bash
MAX_JOBS=4 pip install -U flash-attn --no-build-isolation
```

## 4. 模型下载方式

Qwen3-TTS 支持两种使用方式：

- 直接在代码里写 Hugging Face 模型名，首次运行时自动下载
- 提前下载到本地目录，再从本地目录加载

### 4.1 直接在线加载

代码里直接传：

```python
"Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
```

首次运行会自动下载权重。

### 4.2 手动下载到本地

如果网络不稳定，推荐先手动下载。

使用 Hugging Face CLI：

```bash
pip install -U "huggingface_hub[cli]"
huggingface-cli download Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --local-dir ./models/Qwen3-TTS-12Hz-1.7B-VoiceDesign
```

中国大陆环境也可以考虑 ModelScope：

```bash
pip install -U modelscope
modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --local_dir ./models/Qwen3-TTS-12Hz-1.7B-VoiceDesign
```

下载后，代码中把模型名替换成目录即可：

```python
"./models/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
```

## 5. 最小可运行案例

### 5.1 基础案例：根据声音描述生成语音

示例文件见：

- `examples/voice_design_basic.py`

运行方法：

```bash
python examples/voice_design_basic.py \
  --text "欢迎使用 Qwen3-TTS，本地语音合成已经准备完成。" \
  --language Chinese \
  --instruct "年轻女性，声音清晰自然，语速适中，带一点科技产品演示的专业感。" \
  --output outputs/voice_design_basic.wav
```

这个案例适合：

- 验证本地环境是否跑通
- 快速试听不同音色提示词的效果
- 生成单条播报、欢迎词、短音频

### 5.2 进阶案例：先设计音色，再批量生成角色台词

示例文件见：

- `examples/voice_design_then_clone.py`

运行方法：

```bash
python examples/voice_design_then_clone.py \
  --ref-text "你好，我是你的虚拟向导，接下来由我陪你完成整个流程。" \
  --ref-language Chinese \
  --ref-instruct "二十多岁男性，中低音，冷静、可靠、亲和，像高级产品的中文旁白。" \
  --text "第一步，请先确认你的输入参数。" \
  --text "第二步，系统会自动生成语音结果。" \
  --output-dir outputs/voice_design_then_clone
```

这个流程适合：

- 长对话角色
- 游戏 NPC 配音
- 数字人固定角色声音
- 多句文案保持统一音色

### 5.3 复用刚刚生成的音色，直接批量生产

如果你已经执行过：

```bash
python examples/voice_design_basic.py \
	--text "欢迎使用 Qwen3-TTS，本地语音合成已经准备完成。" \
	--language Chinese \
	--instruct "年轻女性，声音清晰自然，语速适中，带一点科技产品演示的专业感。" \
	--output outputs/voice_design_basic.wav
```

那么你已经拿到了一段“设计好的声音参考音频”。下一步不要再调用 `generate_voice_design`，而是：

1. 用 `Qwen3-TTS-12Hz-1.7B-Base` 读取这段参考音频
2. 传入这段参考音频对应的原始参考文本
3. 构造 `voice_clone_prompt`
4. 用这个 prompt 批量生成多句新文本

示例文件见：

- `examples/reuse_designed_voice_batch.py`

运行方法：

```bash
python examples/reuse_designed_voice_batch.py \
	--ref-audio outputs/voice_design_basic.wav \
	--ref-text "欢迎使用 Qwen3-TTS，本地语音合成已经准备完成。" \
	--language Chinese \
	--text "这是第一条批量生成内容。" \
	--text "这是第二条批量生成内容。" \
	--text "这是第三条批量生成内容。" \
	--merged-output outputs/reuse_designed_voice_batch/all_in_one.wav \
	--output-dir outputs/reuse_designed_voice_batch
```

执行后会得到：

- `outputs/reuse_designed_voice_batch/line_01.wav`
- `outputs/reuse_designed_voice_batch/line_02.wav`
- `outputs/reuse_designed_voice_batch/line_03.wav`
- `outputs/reuse_designed_voice_batch/all_in_one.wav`

如果你只想得到一个完整音频文件，重点加上：

- `--merged-output`: 输出合并后的总音频文件
- `--pause-ms`: 每句之间插入的静音时长，默认 300 毫秒

这里有一个关键点：

- `--ref-text` 必须与 `outputs/voice_design_basic.wav` 这段参考音频的实际文本一致

也就是你刚才生成 `voice_design_basic.wav` 时使用的文本：

```text
欢迎使用 Qwen3-TTS，本地语音合成已经准备完成。
```

如果 `ref_text` 和参考音频内容不一致，复用出来的音色稳定性和可懂度通常会下降。

## 6. Python 直接调用示例

下面是最核心的 VoiceDesign 推理代码。

```python
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

model_name = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"

use_cuda = torch.cuda.is_available()
dtype = torch.bfloat16 if use_cuda else torch.float32
attn_impl = "flash_attention_2" if use_cuda else None
device_map = "cuda:0" if use_cuda else "cpu"

load_kwargs = {
	"device_map": device_map,
	"dtype": dtype,
}
if attn_impl is not None:
	load_kwargs["attn_implementation"] = attn_impl

model = Qwen3TTSModel.from_pretrained(model_name, **load_kwargs)

wavs, sr = model.generate_voice_design(
	text="欢迎使用本地语音合成。",
	language="Chinese",
	instruct="成熟稳重的中文男声，吐字清晰，语速平稳，像企业宣传片旁白。",
)

sf.write("output_voice_design.wav", wavs[0], sr)
print("saved to output_voice_design.wav")
```

## 7. 启动本地 Web UI

如果你不想先写代码，可以直接启动官方提供的本地 Web UI。

先查看帮助：

```bash
qwen-tts-demo --help
```

启动 VoiceDesign 模型：

```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --ip 0.0.0.0 --port 8000
```

启动后访问：

```text
http://127.0.0.1:8000
```

如果你已经提前把模型下载到了本地目录，也可以这样启动：

```bash
qwen-tts-demo ./models/Qwen3-TTS-12Hz-1.7B-VoiceDesign --ip 0.0.0.0 --port 8000
```

## 8. 代码案例说明

### 8.1 `generate_voice_design`

这是 VoiceDesign 模型最关键的接口，核心参数有三个：

- `text`: 要合成的文本
- `language`: 语言，比如 `Chinese`、`English`
- `instruct`: 对声音特征、情绪、年龄、语气、节奏的自然语言描述

一个比较实用的提示词模板：

```text
性别 + 年龄 + 音区/音色 + 情绪 + 语速 + 使用场景
```

例如：

- `年轻女性，声音明亮，轻快自然，带有客服式亲和力，适合产品引导语音。`
- `中年男性，低沉稳重，吐字清晰，像纪录片旁白，节奏稍慢。`
- `少年感男声，略带紧张，但整体真诚温和，适合角色对白。`

### 8.2 保持音色一致的方法

如果你需要同一个角色说很多句台词，不建议每句话都重新用 `VoiceDesign` 设计一次，因为结果可能略有波动。

更稳定的做法：

1. 先用 `VoiceDesign` 生成一小段参考音频
2. 再用 `Base` 模型把这段参考音频转成 `voice_clone_prompt`
3. 后续所有新台词都通过 `generate_voice_clone` 复用这个 prompt

这正是 `examples/voice_design_then_clone.py` 演示的流程。

如果你已经有一段生成好的参考音频，比如 `outputs/voice_design_basic.wav`，那就不需要重新设计声音，可以直接走 `examples/reuse_designed_voice_batch.py`。

### 8.3 什么时候需要 `ref_text`

使用 `Base` 模型复用音色时，最稳妥的方式是同时提供：

- `ref_audio`
- `ref_text`

其中：

- `ref_audio` 是参考音频
- `ref_text` 是这段参考音频逐字对应的文本

原因是 `Base` 模型在构造复用提示时，不仅要提取音色，也要结合参考语音与文本的对应关系。虽然某些场景可以只用说话人向量，但效果通常不如同时提供参考文本稳定。

## 9. 常见问题

### 9.1 第一次运行很慢

常见原因：

- 首次下载模型权重
- CPU 推理速度慢
- 没有使用 FlashAttention 2

### 9.2 显存不够

可以尝试：

- 改用更小的模型，例如 0.6B 版本
- 缩短单次生成文本长度
- 减少批量请求数量
- 确保使用 `float16` 或 `bfloat16`

### 9.3 macOS 上无法安装 flash-attn

这是常见情况。macOS 本地通常不需要强装 `flash-attn`，直接跳过即可。把模型放在 CPU 模式先跑通流程更重要。

### 9.4 如何加载本地模型目录

把：

```python
"Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
```

替换为：

```python
"./models/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
```

### 9.5 如何批量生成多条语音

Qwen3-TTS 支持传列表进行批量推理，例如：

```python
wavs, sr = model.generate_voice_design(
	text=[
		"欢迎来到演示现场。",
		"接下来请看第二部分内容。",
	],
	language=["Chinese", "Chinese"],
	instruct=[
		"成熟稳重的中文男声，像活动主持人。",
		"成熟稳重的中文男声，像活动主持人。",
	],
)
```

## 10. 推荐实践

如果你是在做正式项目，建议采用下面的使用策略：

- 单句试听、角色探索：用 `VoiceDesign`
- 长篇一致角色：用 `VoiceDesign + Base` 组合
- 固定品牌音色、固定说话人：用 `CustomVoice`

## 11. 参考链接

- 官方 GitHub: https://github.com/QwenLM/Qwen3-TTS
- VoiceDesign 模型页: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign
- qwen-tts PyPI: https://pypi.org/project/qwen-tts/
- vLLM Omni 示例: https://github.com/vllm-project/vllm-omni/tree/main/examples/offline_inference/qwen3_tts

## 12. 快速开始

如果你只想最快跑通一次，执行下面四步即可：

```bash
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts
pip install -U qwen-tts soundfile
python examples/voice_design_basic.py --text "你好，这是本地 Qwen3-TTS 语音合成测试。" --language Chinese --instruct "年轻男声，清晰自然，语速适中。" --output outputs/test.wav
```

执行成功后，你会在 `outputs/test.wav` 得到生成音频。

如果你已经有参考音频，直接批量复用可以执行：

```bash
python examples/reuse_designed_voice_batch.py \
	--ref-audio outputs/voice_design_basic.wav \
	--ref-text "欢迎使用 Qwen3-TTS，本地语音合成已经准备完成。" \
	--language Chinese \
	--text "欢迎来到第一部分。" \
	--text "下面开始第二部分内容讲解。" \
	--merged-output outputs/reuse_batch/final.wav \
	--output-dir outputs/reuse_batch
```
