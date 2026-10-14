/**
 * Default Providers Service - Generic implementation with minimal returns
 */

import type { ProvidersService } from './types'
import { predefinedProviders } from '@/constants/providers'
import { providerModels } from '@/constants/models'
import { getModelCapabilities } from '@/lib/models'

export class DefaultProvidersService implements ProvidersService {
  async getProviders(): Promise<ModelProvider[]> {
    try {
      const providers = predefinedProviders
        .map((provider) => {
          let models = provider.models as Model[]
          if (Object.keys(providerModels).includes(provider.provider)) {
            const builtInModels = providerModels[
              provider.provider as unknown as keyof typeof providerModels
            ].models as unknown as string[]

            if (Array.isArray(builtInModels)) {
              models = builtInModels.map((model) => {
                const modelManifest = models.find((e) => e.id === model)
                return {
                  ...(modelManifest ?? { id: model, name: model }),
                  capabilities: getModelCapabilities(provider.provider, model),
                } as Model
              })
            }
          }

          return {
            ...provider,
            models,
          } as unknown as ModelProvider
        })
        .filter(Boolean)
      return providers as ModelProvider[]
    } catch {
      return []
    }
  }

  async fetchModelsFromProvider(provider: ModelProvider): Promise<string[]> {
    console.log('fetchModelsFromProvider called with provider:', provider)
    return []
  }

  async updateSettings(providerName: string, settings: ProviderSetting[]): Promise<void> {
    console.log('updateSettings called:', { providerName, settings })
  }

  async deleteProviderKeys(providerName: string): Promise<void> {
    console.log('deleteProviderKeys called:', { providerName })
  }

  fetch(): typeof fetch {
    return fetch
  }
}
