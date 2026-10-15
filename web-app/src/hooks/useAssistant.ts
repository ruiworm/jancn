import { getServiceHub } from '@/hooks/useServiceHub'
import { Assistant as CoreAssistant } from '@janhq/core'
import { create } from 'zustand'
import { localStorageKey } from '@/constants/localStorage'

interface AssistantState {
  assistants: Assistant[]
  currentAssistant: Assistant | undefined
  loading: boolean
  defaultAssistantId: string
  addAssistant: (assistant: Assistant) => void
  updateAssistant: (assistant: Assistant) => void
  deleteAssistant: (id: string) => void
  setCurrentAssistant: (
    assistant: Assistant | undefined,
    saveToStorage?: boolean
  ) => void
  setDefaultAssistant: (id: string) => void
  setAssistants: (assistants: Assistant[] | null) => void
}

const setLastUsedAssistantId = (assistantId: string) => {
  try {
    localStorage.setItem(localStorageKey.lastUsedAssistant, assistantId)
  } catch (error) {
    console.debug('Failed to set last used assistant in localStorage:', error)
  }
}

export const defaultAssistant: Assistant = {
  id: 'jan',
  name: 'AI',
  created_at: 1747029866.542,
  parameters: {},
  avatar: '👋',
  description:
    '通用的桌面智能助手，具备强大的逻辑推理能力，能协助您完成各类复杂任务与问答。',
  instructions: `你是一个智能桌面助手，请始终使用用户提问所用的语言进行准确、清晰、有逻辑且富有帮助的回答。
如果用户提问使用的是中文，请使用自然流畅的中文回答。

在回答复杂问题时：
1. 先思考并理清核心要点，分步骤清晰阐述；
2. 保持回答客观严谨，提供切实可行的解决方案；
3. 充分发挥推理能力，给出高质量、结构化的内容。`,
}

export const translationAssistant: Assistant = {
  id: 'translator',
  name: '中英翻译助手',
  created_at: 1747029866.543,
  parameters: {
    temperature: 0.3,
  },
  avatar: '🌐',
  description: '专业的中英双语互译助手，忠实直译并提供地道流畅的润色优化建议。',
  instructions: `你是一名精通中文和英文的双语翻译专家。你的核心准则是“忠实直译，给出地道的润色建议”。

当接收到用户的内容时：
1. 【直译】：忠实于原文的词义、语气与结构，做到准确严谨、无遗漏；
2. 【地道润色】：根据语言习惯与上下文语境，提供更符合母语者表达的自然表达建议；
3. 【难点解析】（如需要）：指出难点词汇、成语或文化背景差异。`,
}

export const writingAssistant: Assistant = {
  id: 'creative_writer',
  name: '长文写作助手',
  created_at: 1747029866.544,
  parameters: {
    temperature: 0.95,
    top_p: 0.95,
  },
  avatar: '✍️',
  description: '高创造力的深度长文写作助手，适合文章、方案、故事、综述与深度报告创作。',
  instructions: `你是一名专业资深的内容创作者与长文写作者。你具备极高的创造力、丰富的词汇量和深邃的逻辑架构能力。

写作规范：
1. 深入展开构思，避免空泛模板化的套话；
2. 段落结构严谨，层次分明，逻辑递进，善用生动的修辞与有力的论据；
3. 根据主题自动匹配最合适的写作风格（文学叙事、专业白皮书、行业深度分析或公文汇报）。`,
}

export const builtinAssistants: Assistant[] = [
  defaultAssistant,
  translationAssistant,
  writingAssistant,
]

const getLastUsedAssistantId = (assistants: Assistant[]): string => {
  let lastUsedId
  try {
    lastUsedId = localStorage.getItem(localStorageKey.lastUsedAssistant)
  } catch (error) {
    console.debug('Failed to get last used assistant from localStorage:', error)
  }

  if (lastUsedId) {
    const lastUsedAssistant = assistants.find((a) => a.id === lastUsedId)
    if (lastUsedAssistant) {
      return lastUsedId
    }
  }

  if (lastUsedId === '') return ''

  return defaultAssistant.id
}

const getDefaultAssistantId = (): string | null => {
  let defaultAssistantId: string | null = null

  try {
    defaultAssistantId = localStorage.getItem(localStorageKey.defaultAssistantId)
  } catch (error) {
    console.debug('Failed to get last used assistant from localStorage:', error)
  }

  return defaultAssistantId
}

const setDefaultAssistantId = (assistantId: string) => {
  try {
    if (!assistantId) {
      localStorage.removeItem(localStorageKey.defaultAssistantId)
    }
    else {
      localStorage.setItem(localStorageKey.defaultAssistantId, assistantId)
    }
  } catch (error) {
    console.debug('Failed to set default assistant in localStorage:', error)
  }
}

// Platform-aware initial state
const getInitialAssistantState = () => {
  return {
    assistants: [...builtinAssistants],
    currentAssistant: defaultAssistant,
    defaultAssistantId: '',
    loading: true,
  }
}

export const useAssistant = create<AssistantState>((set, get) => ({
  ...getInitialAssistantState(),
  addAssistant: (assistant) => {
    set({ assistants: [...get().assistants, assistant] })
    getServiceHub()
      .assistants()
      .createAssistant(assistant as unknown as CoreAssistant)
      .catch((error) => {
        console.error('Failed to create assistant:', error)
      })
  },
  updateAssistant: (assistant) => {
    const state = get()
    set({
      assistants: state.assistants.map((a) =>
        a.id === assistant.id ? assistant : a
      ),
      // Update currentAssistant if it's the same assistant being updated
      currentAssistant:
        state.currentAssistant?.id === assistant.id
          ? assistant
          : state.currentAssistant,
    })
    // Create assistant already cover update logic
    getServiceHub()
      .assistants()
      .createAssistant(assistant as unknown as CoreAssistant)
      .catch((error) => {
        console.error('Failed to update assistant:', error)
      })
  },
  deleteAssistant: (id) => {
    const state = get()
    getServiceHub()
      .assistants()
      .deleteAssistant(
        state.assistants.find((e) => e.id === id) as unknown as CoreAssistant
      )
      .catch((error) => {
        console.error('Failed to delete assistant:', error)
      })

    // Check if we're deleting the current or default assistant
    const wasCurrentAssistant = state.currentAssistant?.id === id
    const wasDefaultAssistant = state.defaultAssistantId === id

    set({ assistants: state.assistants.filter((a) => a.id !== id) })

    // If the deleted assistant was current, fallback to default and update localStorage
    if (wasCurrentAssistant) {
      set({ currentAssistant: state.assistants.find(a => a.id === defaultAssistant.id) })
      setLastUsedAssistantId(defaultAssistant.id)
    }

    // If the deleted assistant was the default, reset to the built-in default
    if (wasDefaultAssistant) {
      setDefaultAssistantId(defaultAssistant.id)
    }
  },
  setDefaultAssistant: (id) => {
    const newAssistant = get().assistants?.find(a => a.id === id)
    if (newAssistant) {
      set({ defaultAssistantId: id, currentAssistant: newAssistant })
      setLastUsedAssistantId(id)
    }
    else {
      set({ defaultAssistantId: id })
    }
    setDefaultAssistantId(id)
  },
  setCurrentAssistant: (assistant, saveToStorage = true) => {
    const currentAssistant = get().currentAssistant
    if (currentAssistant !== assistant) {
      set({ currentAssistant: assistant })
      if (saveToStorage) {
        setLastUsedAssistantId(assistant?.id || '')
      }
    }
  },
  setAssistants: (assistants) => {
    if (assistants) {
      assistants.forEach((a) => {
        a.id = a.id?.toString()
        if (a.id === 'jan' || a.name === 'Jan' || a.name === 'AI 助手') {
          a.name = 'AI'
          if (
            !a.description ||
            a.description.startsWith('Jan is a helpful') ||
            a.description.includes('Jan')
          ) {
            a.description =
              '通用的桌面智能助手，具备强大的逻辑推理能力，能协助您完成各类复杂任务与问答。'
          }
        }
      }) // new String("id") !== "id"

      // Automatically register the new built-in assistants if missing from disk
      if (!assistants.some((a) => a.id === translationAssistant.id)) {
        assistants.push(translationAssistant)
        getServiceHub()
          .assistants()
          .createAssistant(translationAssistant as unknown as CoreAssistant)
          .catch(() => {})
      }
      if (!assistants.some((a) => a.id === writingAssistant.id)) {
        assistants.push(writingAssistant)
        getServiceHub()
          .assistants()
          .createAssistant(writingAssistant as unknown as CoreAssistant)
          .catch(() => {})
      }

      const lastUsedId = getLastUsedAssistantId(assistants)
      const lastUsedAssist = assistants.find((a) => a.id === lastUsedId)
      const defaultAssistantId = getDefaultAssistantId() || ''
      const defaultAssistantItem = assistants.find((a) => a.id === defaultAssistantId)
      set({
        assistants,
        currentAssistant: defaultAssistantItem || lastUsedAssist || defaultAssistant,
        defaultAssistantId,
        loading: false,
      })
    } else {
      set({ loading: false })
    }
  },
}))
