import i18n from '@/i18n/setup'

interface ParamLocale {
  title: string
  description?: string
  hint?: string
}

const PARAM_TRANSLATIONS: Record<string, ParamLocale> = {
  // Sampler & Inference params
  stream: {
    title: '流式传输 (Stream)',
    description: '启用大模型实时的逐字流式打字输出效果。',
  },
  max_context_tokens: {
    title: '上下文上限 (Context Tokens)',
    description: '上下文窗口总预算（输入 + 输出）。超出时会自动裁剪或压缩旧消息。设为 0 表示不限制。',
  },
  max_output_tokens: {
    title: '最大生成长度 (Max Output Tokens)',
    description: '单次回答允许模型生成的最大 Token 数量。',
  },
  auto_compact: {
    title: '自动压缩上下文 (Auto Compact)',
    description: '达到上下文限制时，自动对较早的历史消息进行摘要归纳而不是直接丢弃。',
  },
  temperature: {
    title: '采样温度 (Temperature)',
    description: '控制回复的随机性和创造力。值越低回答越严谨固定，值越高越发散丰富。',
    hint: '值越高越有创意；0 为完全确定。',
  },
  top_p: {
    title: '核采样 (Top P)',
    description: '累计概率采样阈值。较高的值允许更多样的词汇选择。',
  },
  top_k: {
    title: 'Top K 采样',
    description: '仅从概率最高的 K 个候选词中采样。0 为禁用。',
  },
  min_p: {
    title: 'Min P 采样',
    description: '相对于最可能词元的最小概率比例截断。',
  },
  repeat_penalty: {
    title: '重复惩罚 (Repeat Penalty)',
    description: '对重复出现的词句施加惩罚，防止模型陷入复读或死循环。',
  },
  presence_penalty: {
    title: '话题存在惩罚 (Presence Penalty)',
    description: '根据词是否在已有文本中出现过施加惩罚，促使模型讨论新话题。',
  },
  frequency_penalty: {
    title: '词频惩罚 (Frequency Penalty)',
    description: '根据词出现的绝对频次施加惩罚，减少高频词的重复。',
  },
  repeat_last_n: {
    title: '惩罚回溯范围 (Repeat Last N)',
    description: '考虑重复惩罚时回溯检查的最近 Token 数量。',
  },
  stop: {
    title: '停止词 (Stop Sequences)',
    description: '遇到这些特定词或标记时，模型将立即停止生成。',
  },
  reasoning_effort: {
    title: '思考强度 (Reasoning Effort)',
    description: '针对深度思考模型（如 o1 / DeepSeek-R1）的推理思考预算程度。',
  },
  thinking_budget_tokens: {
    title: '思考预算 (Thinking Budget)',
    description: '允许模型用于内部推理链的最大思考 Token 数量。',
  },
  json_schema: {
    title: '结构化 JSON 约束',
    description: '强制模型严格按照提供的 JSON Schema 规范格式输出。',
  },
  grammar: {
    title: '语法约束 (Grammar / GBNF)',
    description: '通过 GBNF 语法规则强制模型按照指定语法输出。',
  },
  ignore_eos: {
    title: '忽略结束标记 (Ignore EOS)',
    description: '即使模型输出结束符也继续生成，直到达到最大 Token。',
  },
  typical_p: {
    title: '典型采样 (Typical P)',
    description: '根据信息熵优先选择条件信息量符合预期的典型 Token。',
  },
  top_n_sigma: {
    title: 'Top N Sigma',
    description: '基于标准差范围的高级采样器。',
  },
  samplers: {
    title: '采样器执行顺序',
    description: '定义不同采样算子之间的执行先后顺序。',
  },
  backend_sampling: {
    title: '后端原生采样',
    description: '委托 llama.cpp 后端直接处理采样逻辑。',
  },
  mirostat: {
    title: 'Mirostat 动态采样',
    description: '动态调整困惑度的自适应采样算法。0 = 禁用。',
  },
  mirostat_tau: {
    title: 'Mirostat 目标熵 (Tau)',
    description: 'Mirostat 算法的目标交叉熵。',
  },
  mirostat_eta: {
    title: 'Mirostat 学习率 (Eta)',
    description: 'Mirostat 算法的学习率。',
  },
  dry_multiplier: {
    title: 'DRY 重复抑制乘数',
    description: 'DRY（Don\'t Repeat Yourself）算法的惩罚系数。',
  },
  dry_base: {
    title: 'DRY 基数',
    description: 'DRY 算法的指数增长基数。',
  },
  dry_allowed_length: {
    title: 'DRY 允许重复长度',
    description: '不触发惩罚的最大允许序列匹配长度。',
  },
  dry_penalty_last_n: {
    title: 'DRY 惩罚回溯窗口',
    description: 'DRY 算法扫描重复序列的最大上下文窗口大小。',
  },
  xtc_probability: {
    title: 'XTC 剔除概率',
    description: '从候选池中移除高概率词元的触发概率。',
  },
  xtc_threshold: {
    title: 'XTC 概率阈值',
    description: '定义判定为高概率候选词的置信度阈值。',
  },
  dynatemp_range: {
    title: '动态温度区间',
    description: '围绕基准温度波动的上下限范围。',
  },
  dynatemp_exp: {
    title: '动态温度指数',
    description: '控制温度在区间内波动的幂律指数。',
  },
  seed: {
    title: '随机种子 (Seed)',
    description: '用于复现相同输出的固定随机数种子。',
  },

  // Llama.cpp engine & provider settings
  llamacpp_env: {
    title: '环境变量 (Environmental Variables)',
    description: '为 llama.cpp 设置的环境变量（键=值），多条用分号“;”隔开。如 GGML_VK_VISIBLE_DEVICES=0,1',
  },
  models_max: {
    title: '最大同时常驻模型数',
    description: '允许同时常驻内存/显存的最大模型数量。0 为无限制。',
  },
  timeout: {
    title: '模型连接超时（秒）',
    description: 'llama.cpp 连接与载入的最大超时时间（秒）。',
  },
  fit: {
    title: '显存自适应 (Auto-adjust to VRAM)',
    description: '是否根据设备显存容量自动计算并优化运行参数。',
  },
  fit_target: {
    title: '单设备预留显存余量 (MiB)',
    description: '为每个 GPU 预留的安全显存余量，防止爆显存崩溃。',
  },
  fit_ctx: {
    title: '自适应最小上下文大小',
    description: '自适应显存开启时允许配置的最小上下文 Token 大小。',
  },
  threads: {
    title: 'CPU 计算线程数 (Threads)',
    description: 'CPU 推理时使用的计算线程数。通常设为物理核心数性能最佳。',
  },
  'api-key': {
    title: 'API 密钥 (API Key)',
    description: '用于调用模型服务商进行身份认证的 API 密钥。',
  },
  'base-url': {
    title: 'API 基础地址 (Base URL)',
    description: '模型请求的目标服务地址（如兼容 OpenAI 格式的反向代理或官方端点）。',
  },
  ctx_len: {
    title: '上下文长度 (Context Length)',
    description: '为该模型分配的最大上下文窗口大小。',
  },
  ngl: {
    title: 'GPU 显存卸载层数 (GPU Layers)',
    description: '卸载到显卡 GPU 显存中运行的神经网络层数。层数越高推理越快。',
  },
  offload_mmproj: {
    title: '多模态视觉投影卸载至 GPU',
    description: '是否将视觉多模态模型的投影权重完全放入显存中运行。',
  },
  chat_template: {
    title: '对话模板 (Chat Template)',
    description: '模型解析对话角色（System/User/Assistant）所用的格式模板。',
  },
  batch_size: {
    title: '提示词处理批大小 (Batch Size)',
    description: '一次性并行评估提示词的 Token 批次大小。',
  },
  cpu_moe: {
    title: 'CPU 运行 MoE 专家层',
    description: '将混合专家（MoE）的稀疏专家权重放在 CPU/内存上运行以节省显存。',
  },
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  common: '常用参数 (Common)',
  penalties: '惩罚项 (Penalties)',
  output: '输出控制 (Output Control)',
  advanced: '高级采样器 (Advanced Samplers)',
}

const GROUP_TRANSLATIONS: Record<string, { title: string; description: string }> = {
  mirostat: {
    title: 'Mirostat 动态采样',
    description: '通过动态评估困惑度来控制生成质量的算法。',
  },
  dry: {
    title: 'DRY 重复抑制',
    description: '针对长文本中连续重复序列的模式识别惩罚。',
  },
  xtc: {
    title: 'XTC 概率截断',
    description: '以一定概率剔除最显著词元以激发多样性。',
  },
  dynatemp: {
    title: '动态温度 (Dynamic Temperature)',
    description: '围绕基准采样温度在一个安全区间范围内随机波动。',
  },
}

function isChinese(): boolean {
  return !i18n.language || i18n.language.toLowerCase().startsWith('zh')
}

export function getTranslatedParamTitle(key: string, original?: string): string {
  if (isChinese() && PARAM_TRANSLATIONS[key]?.title) {
    return PARAM_TRANSLATIONS[key].title
  }
  return original || key
}

export function getTranslatedParamDescription(key: string, original?: string): string {
  if (isChinese() && PARAM_TRANSLATIONS[key]?.description) {
    return PARAM_TRANSLATIONS[key].description
  }
  return original || ''
}

export function getTranslatedParamHint(key: string, original?: string): string | undefined {
  if (isChinese() && PARAM_TRANSLATIONS[key]?.hint) {
    return PARAM_TRANSLATIONS[key].hint
  }
  return original
}

export function getTranslatedCategoryTitle(id: string, original?: string): string {
  if (isChinese() && CATEGORY_TRANSLATIONS[id]) {
    return CATEGORY_TRANSLATIONS[id]
  }
  return original || id
}

export function getTranslatedGroupTitle(id: string, original?: string): string {
  if (isChinese() && GROUP_TRANSLATIONS[id]?.title) {
    return GROUP_TRANSLATIONS[id].title
  }
  return original || id
}

export function getTranslatedGroupDescription(id: string, original?: string): string {
  if (isChinese() && GROUP_TRANSLATIONS[id]?.description) {
    return GROUP_TRANSLATIONS[id].description
  }
  return original || ''
}
