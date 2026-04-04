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

如果你想把句子之间停顿调长一点，可以加上：
```bash
--pause-ms 500
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

## 13. 常用场景与实现方案

下面这些是本地使用 Qwen3-TTS 时最常见的业务场景。核心不是“模型能不能做”，而是“该选哪个模型、怎样组合，才能稳定进入生产”。

### 13.1 产品欢迎语、播报语、通知音

典型特点：

- 文本短
- 对时延要求不高
- 需要快速试音色
- 经常修改文案，但不一定要求绝对固定角色声线

推荐方案：

- 先用 `VoiceDesign`
- 如果后续文案越来越多，再切到“VoiceDesign 一次 + Base 复用”

落地方式：

1. 用 `examples/voice_design_basic.py` 设计一个满意音色
2. 满意后，把输出 wav 保存为参考音频
3. 再用 `examples/reuse_designed_voice_batch.py` 批量生成多条欢迎语或播报语

适用例子：

- App 欢迎语
- 设备开机提示音
- 活动开场播报
- 展厅语音提示

### 13.2 短视频旁白、口播、宣传片解说

典型特点：

- 文案按段落组织
- 需要整段输出为一个总音频
- 要求音色一致、停顿自然

推荐方案：

- `VoiceDesign` 先定音色
- `Base` 负责整批文案生成
- 使用 `--merged-output` 合并成完整音频

落地方式：

1. 先写一段较短的参考句，设计出目标旁白风格
2. 使用 `reuse_designed_voice_batch.py` 对每段文案分别生成
3. 用 `--pause-ms` 控制句间停顿
4. 输出一个完整 wav，再进剪辑软件做混音或配乐

建议：

- 单句不要太长，长句先人工分段
- 每段尽量是一个完整语义单位
- 宣传片旁白更适合“中低音、稳定、吐字清晰”的提示词

### 13.3 数字人、虚拟角色、游戏 NPC

典型特点：

- 角色声音必须长期稳定
- 同一角色要说很多句不同台词
- 可能有多个角色

推荐方案：

- 每个角色先用 `VoiceDesign` 生成一段参考音频
- 再分别为每个角色构建独立的 `voice_clone_prompt`
- 所有后续台词都走 `Base`

落地方式：

1. 每个角色准备一个角色设定文本
2. 用 `VoiceDesign` 生成角色参考音频
3. 保存角色元信息：`角色名 + ref_audio + ref_text + 人设提示词`
4. 后续批量生成时按角色切换不同 prompt

推荐保存结构：

```text
assets/voices/
	narrator/
		ref.wav
		ref.txt
	assistant/
		ref.wav
		ref.txt
	npc_guard/
		ref.wav
		ref.txt
```

如果你后面要做多角色，我建议下一步补一个“按角色配置文件批量生产”的脚本，会比手工传命令稳定很多。

### 13.4 客服语音、IVR、电话外呼

典型特点：

- 句式重复多
- 内容经常更新
- 重点是清晰、稳定、可批量生成

推荐方案：

- 优先固定一个品牌音色
- 如果品牌声线来自你自己定义的人设，先 `VoiceDesign` 再 `Base`
- 如果接受预置官方音色，可考虑 `CustomVoice`

落地方式：

1. 先确认品牌是否要固定人声形象
2. 固定后不要频繁改参考音频
3. 所有模板文案都走批量脚本生成
4. 输出命名尽量和业务 key 一一对应

推荐命名方式：

```text
outputs/ivr/
	welcome.wav
	queue_notice.wav
	service_busy.wav
	verification_code.wav
```

### 13.5 有声书、长文章朗读

典型特点：

- 文本很长
- 需要章节级处理
- 容易遇到长文本停顿、节奏和稳定性问题

推荐方案：

- 不要一次性把全文扔给模型
- 先按段或按句切分
- 用固定 prompt 批量生成，再按章节合并

落地方式：

1. 先做文本预处理，按自然段或句号切分
2. 控制每段长度，避免过长输入
3. 每一章单独输出一个目录
4. 最后再把整章或整本书进行后处理拼接

建议：

- 长文案最重要的是切分策略，不是一次生成到底
- 保留原文索引，方便重生成单段
- 章节级别输出比全文级别输出更容易维护

### 13.6 多语言播报

典型特点：

- 需要中文、英文、日文等多个版本
- 希望保持相近风格
- 不同语言发音效果会有差异

推荐方案：

- 每种语言单独做一次试听
- `language` 参数显式指定，不要完全依赖自动识别
- 对不同语言分别优化提示词

落地方式：

1. 同一角色先分别测试中文、英文等语言样本
2. 每种语言都记录最稳定的一版提示词
3. 批量生成时按语言分批处理

经验建议：

- 同一个角色跨语言不一定完全等价
- 最好为不同语言分别存一份参考音频与参数配置

### 13.7 品牌固定音色

典型特点：

- 希望所有内容都保持统一品牌识别度
- 会跨很多场景反复使用

推荐方案：

- 不要每次重新设计声音
- 选定一版满意参考音频后冻结下来
- 后续全部基于同一份 `voice_clone_prompt` 或同一参考音频复用

落地方式：

1. 专门做一个品牌音色评审流程
2. 选定后固定 `ref.wav` 与 `ref.txt`
3. 任何新文案都从同一品牌素材出发生成
4. 不同业务线只修改文本，不修改参考音频

### 13.8 需要快速交互试音，不想先写代码

典型特点：

- 还在探索风格
- 需要快速试听多种提示词
- 可能是产品、运营或内容同学先参与试音

推荐方案：

- 先使用本地 Web UI
- 确认风格后再沉淀为脚本和批量流程

落地方式：

1. 启动 `qwen-tts-demo`
2. 先试多组 `instruct`
3. 确定满意风格后，再转成 Python 脚本固化

这一步适合做探索，不适合作为长期生产流程，因为可复用性和可追溯性不如脚本。

## 14. 选型建议

如果你不知道该选哪条路，可以直接按这个规则判断：

- 只想快速出一条试听音频：`VoiceDesign`
- 已经有满意音色，想批量生产：`Base + ref_audio + ref_text`
- 想长期维护一个固定角色或品牌声音：`VoiceDesign 一次 + Base 长期复用`
- 只想从官方预置说话人里选一个稳定声音：`CustomVoice`
- 要做长文本项目：先切分文本，再批量生成，再合并音频

## 15. 下一步可继续补充的能力

如果你要把这套方案继续往生产方向推进，后面通常还会补这几类工具：

- 从 txt 或 csv 批量读取文案后自动生成音频
- 按角色配置文件批量生成多角色台词
- 自动切句、自动停顿、自动合并长文音频
- 输出文件名与业务 ID 绑定，方便回传到系统
- 批量失败重试和生成日志记录

## 16. 批量生产常用音色库

如果你的目标是先沉淀一批常用音色，后面在业务里只传“音色名 + 文本”就能直接复用，推荐采用“音色库”方案。

这个方案分成两步：

1. 用 `VoiceDesign` 批量生成参考音色，保存到本地音色库
2. 用 `Base` 按音色名读取参考音频并批量合成新文本

这次已经补了两份脚本：

- `examples/build_voice_presets.py`: 批量生产常用音色
- `examples/use_voice_preset_batch.py`: 指定音色名直接复用

以及一份示例配置：

- `configs/voice_presets.example.json`

### 16.1 配置文件格式

示例配置如下：

```json
{
	"presets": [
		{
			"id": "brand_female_01",
			"name": "品牌女声-清晰亲和",
			"language": "Chinese",
			"ref_text": "你好，欢迎使用我们的智能语音服务，接下来我会为你介绍主要功能。",
			"instruct": "年轻女性，声音清晰自然，亲和专业，语速适中，适合产品引导和品牌播报。"
		}
	]
}
```

如果你更想直接使用 JSON 数组，也支持下面这种格式：

```json
[
	{
		"id": "brand_female_01",
		"name": "品牌女声-清晰亲和",
		"language": "Chinese",
		"ref_text": "你好，欢迎使用我们的智能语音服务，接下来我会为你介绍主要功能。",
		"instruct": "年轻女性，声音清晰自然，亲和专业，语速适中，适合产品引导和品牌播报。"
	},
	{
		"id": "brand_male_01",
		"name": "品牌男声-稳重旁白",
		"language": "Chinese",
		"ref_text": "欢迎来到本次演示现场，接下来请跟随我的讲解了解核心内容。",
		"instruct": "中青年男性，中低音，稳重清晰，节奏平稳，适合宣传片旁白和正式播报。"
	}
]
```

两种格式现在都支持：

- 顶层对象：`{"presets": [...]}`
- 顶层数组：`[...]`

字段说明：

- `id`: 音色唯一标识，后续复用时就传这个值
- `name`: 便于人工识别的名称
- `language`: 参考语音语言
- `ref_text`: 用于生成参考音频的基准文本
- `instruct`: 声音设计提示词

建议：

- `id` 尽量稳定，不要频繁修改
- `ref_text` 要用自然、清晰、能代表目标风格的一句话
- 一个音色一条参考句就够了，重点是后续长期复用

### 16.2 批量生成音色库

执行：

```bash
python examples/build_voice_presets.py \
	--config configs/voice_presets.example.json \
	--library-dir assets/voice_presets
```

如果你想直接按 JSON 数组文件生成，可以执行：

```bash
python examples/build_voice_presets.py \
	--config configs/voice_presets.array.example.json \
	--library-dir assets/voice_presets
```

如果你不想落文件，也可以直接把 JSON 文本作为参数传入：

```bash
python examples/build_voice_presets.py \
	--config-json '[
	  {
	    "id": "brand_female_01",
	    "name": "品牌女声-清晰亲和",
	    "language": "Chinese",
	    "ref_text": "你好，欢迎使用我们的智能语音服务，接下来我会为你介绍主要功能。",
	    "instruct": "年轻女性，声音清晰自然，亲和专业，语速适中，适合产品引导和品牌播报。"
	  },
	  {
	    "id": "assistant_female_01",
	    "name": "助手女声-轻快友好",
	    "language": "Chinese",
	    "ref_text": "你好呀，我已经准备好了，接下来我会一步一步协助你完成整个流程。",
	    "instruct": "年轻女性，明亮轻快，友好自然，略带科技感，适合作为数字助手与引导角色。"
	  }
	]' \
	--library-dir assets/voice_presets
```

如果你的目标是“通过 JSON 文本配置一批音色，再一次性生成”，推荐优先使用顶层数组格式，因为更适合从别的系统直接导出或拼接。

执行后会生成类似结构：

```text
assets/voice_presets/
	index.json
	brand_female_01/
		ref.wav
		ref.txt
		metadata.json
	brand_male_01/
		ref.wav
		ref.txt
		metadata.json
	assistant_female_01/
		ref.wav
		ref.txt
		metadata.json
```

其中：

- `ref.wav` 是参考音频
- `ref.txt` 是参考文本
- `metadata.json` 是音色元信息
- `index.json` 是音色清单

如果需要重新生成已有音色，可以加：

```bash
--overwrite
```

### 16.3 查看可用音色

```bash
python examples/use_voice_preset_batch.py \
	--library-dir assets/voice_presets \
	--list
```

这个命令会打印当前音色库里的 `preset id`、名称和语言。

### 16.4 指定音色名直接复用

比如你已经生成了 `brand_female_01`，后续可以直接按音色名批量生产：

```bash
python examples/use_voice_preset_batch.py \
	--library-dir assets/voice_presets \
	--preset brand_female_01 \
	--text "欢迎使用本次活动签到服务。" \
	--text "请根据页面提示完成后续操作。" \
	--text "如需帮助，请联系现场工作人员。" \
	--merged-output outputs/preset_brand_female_01/final.wav \
	--output-dir outputs/preset_brand_female_01
```

这样你就不需要每次再传：

- `ref_audio`
- `ref_text`
- `instruct`

后续只需要知道音色名即可。

### 16.5 适合的生产方式

这种音色库模式特别适合下面几类项目：

- 品牌固定旁白
- 多角色数字人
- 客服与 IVR 模板语音
- 展厅、设备、系统提示音
- 短视频团队统一旁白库

### 16.6 推荐管理方式

建议把音色库当作稳定资产管理，而不是每次临时生成。

推荐做法：

1. 先用小范围配置测试几种候选音色
2. 人工试听后保留正式版本
3. 固定 `preset id`，不要频繁变更
4. 后续业务脚本统一按 `preset id` 调用
5. 如果要升级音色，新增新版本，例如 `brand_female_02`

### 16.7 推荐命名规则

推荐 `id` 命名方式：

```text
<业务域>_<角色类型>_<版本号>
```

例如：

- `brand_female_01`
- `brand_male_01`
- `assistant_female_01`
- `narrator_male_02`
- `ivr_service_female_01`

这样后续批量脚本、配置中心、回传系统都更容易对接。

## 17. 从 JSON 数组任务批量生成音频

如果你已经有一批固定音色，并且想直接通过一个 JSON 数组批量生成业务音频，推荐使用：

- `examples/generate_from_preset_tasks.py`

这个脚本的定位是：

- 输入：任务 JSON 数组
- 每条任务指定：`preset`、文本数组、输出位置、是否合并
- 输出：每条任务一组 wav 文件，可选自动合并成一个总音频

### 17.1 任务 JSON 数组格式

示例文件：

- `configs/preset_generation_tasks.array.example.json`

示例内容：

```json
[
	{
		"task_id": "welcome_brand_female",
		"preset": "brand_female_01",
		"texts": [
			"欢迎使用本次活动签到服务。",
			"请根据页面提示完成后续操作。",
			"如需帮助，请联系现场工作人员。"
		],
		"output_dir": "outputs/preset_tasks/welcome_brand_female",
		"merged_output": "outputs/preset_tasks/welcome_brand_female/final.wav",
		"pause_ms": 400
	},
	{
		"task_id": "assistant_steps",
		"preset": "assistant_female_01",
		"texts": [
			"第一步，请先确认你的输入参数。",
			"第二步，系统会自动生成语音结果。",
			"第三步，你可以继续复用当前音色完成批量生产。"
		],
		"merge": true
	}
]
```

字段说明：

- `task_id`: 当前任务标识，用于默认输出目录命名
- `preset`: 要使用的音色 id
- `text`: 单条文本，适合只生成一句
- `texts`: 文本数组，适合批量生成多句
- `output_dir`: 当前任务输出目录，可选
- `merged_output`: 合并后总音频路径，可选
- `merge`: 如果为 `true`，且未显式指定 `merged_output`，则默认输出 `output_dir/final.wav`
- `pause_ms`: 当前任务句间静音毫秒数，可选
- `language`: 可选，默认使用 preset 对应语言

说明：

- `text` 和 `texts` 二选一
- 如果某条任务没有写 `output_dir`，脚本会自动落到 `outputs/preset_tasks/<task_id>/`

### 17.2 执行方法

```bash
python examples/generate_from_preset_tasks.py \
	--library-dir assets/voice_presets \
	--config configs/preset_generation_tasks.array.example.json
```

如果你不想落文件，也可以直接传 JSON 文本：

```bash
python examples/generate_from_preset_tasks.py \
	--library-dir assets/voice_presets \
	--config-json '[
		{
			"task_id": "welcome_brand_female",
			"preset": "brand_female_01",
			"texts": [
				"欢迎使用本次活动签到服务。",
				"请根据页面提示完成后续操作。"
			],
			"merge": true
		},
		{
			"task_id": "assistant_steps",
			"preset": "assistant_female_01",
			"texts": [
				"第一步，请先确认你的输入参数。",
				"第二步，系统会自动生成语音结果。"
			],
			"pause_ms": 500,
			"merge": true
		}
	]'
```

### 17.3 适合的场景

这个脚本适合下面这些生产方式：

- 批量生成欢迎语、引导语、播报语
- 按角色批量生成数字人台词
- 按品牌音色批量生成短视频旁白
- 从上游系统导出的 JSON 数组直接驱动音频生产

### 17.4 实现建议

如果你后面要把这套流程接入业务系统，推荐上游统一输出这种结构：

```json
[
	{
		"task_id": "job_001",
		"preset": "brand_female_01",
		"texts": ["文案一", "文案二"],
		"merge": true
	}
]
```

这样你的业务侧只需要做两件事：

1. 选择 `preset id`
2. 组织 `texts` 数组

音频生产脚本本身就可以保持稳定，不需要频繁改代码。
