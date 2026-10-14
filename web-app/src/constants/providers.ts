export const anthropicProviderSettings = [
  {
    key: 'api-key',
    title: 'API 密钥 (API Key)',
    description:
      'Anthropic API 用于身份认证的 API 密钥。访问您的 [API Keys](https://console.anthropic.com/settings/keys) 页面获取。',
    controller_type: 'input',
    controller_props: {
      placeholder: '请输入 API 密钥',
      value: '',
      type: 'password',
      input_actions: ['unobscure', 'copy'],
    },
  },
  {
    key: 'base-url',
    title: 'API 基础地址 (Base URL)',
    description:
      '请求的目标服务端点基础地址。',
    controller_type: 'input',
    controller_props: {
      placeholder: 'https://api.anthropic.com/v1',
      value: 'https://api.anthropic.com/v1',
    },
  },
]

export const openAIProviderSettings = [
  {
    key: 'api-key',
    title: 'API 密钥 (API Key)',
    description:
      'OpenAI API 用于身份认证的 API 密钥。访问您的 [API Keys](https://platform.openai.com/account/api-keys) 页面获取。',
    controller_type: 'input',
    controller_props: {
      placeholder: '请输入 API 密钥',
      value: '',
      type: 'password',
      input_actions: ['unobscure', 'copy'],
    },
  },
  {
    key: 'base-url',
    title: 'API 基础地址 (Base URL)',
    description:
      '请求的目标服务端点基础地址。',
    controller_type: 'input',
    controller_props: {
      placeholder: 'https://api.openai.com/v1',
      value: 'https://api.openai.com/v1',
    },
  },
]

export const predefinedProviders: ProviderObject[] = []
