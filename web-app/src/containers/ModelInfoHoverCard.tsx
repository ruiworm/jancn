import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  IconAlertTriangle,
  IconCheck,
  IconDeviceDesktopQuestion,
  IconX,
} from '@tabler/icons-react'
import { CatalogModel, ModelQuant } from '@/services/models/types'
import { selectDefaultQuant, extractQuantLabel } from '@/lib/models'
import { useHardware } from '@/hooks/useHardware'
import {
  DEFAULT_CTX_LENGTH,
  estimateModelFit,
  parseFileSize,
  sumMlxModelBytes,
  type FitTier,
} from '@/lib/modelCompatibility'
import { cn } from '@/lib/utils'

interface ModelInfoHoverCardProps {
  model: CatalogModel
  variant?: ModelQuant
  isDefaultVariant?: boolean
  defaultModelQuantizations: readonly string[]
  children?: React.ReactNode
}

type TriggerStyle = {
  icon: typeof IconCheck
  label: string
  detail: string
  pill: string
  dot: string
}

const TRIGGER_STYLES: Record<FitTier, TriggerStyle> = {
  green: {
    icon: IconCheck,
    label: '硬件推荐',
    detail: '可在您的设备显存/内存中流畅运行',
    pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  yellow: {
    icon: IconAlertTriangle,
    label: '可能较慢',
    detail: '可以运行，但剩余可用显存较少',
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  red: {
    icon: IconX,
    label: '显存不足',
    detail: '大概率超出您设备的可用显存和内存',
    pill: 'bg-red-500/10 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  unknown: {
    icon: IconDeviceDesktopQuestion,
    label: '适合度未知',
    detail: '无法预估该模型的内存需求',
    pill: 'bg-secondary text-muted-foreground',
    dot: 'bg-neutral-400',
  },
}

export const ModelInfoHoverCard = ({
  model,
  variant,
  isDefaultVariant,
  defaultModelQuantizations,
  children,
}: ModelInfoHoverCardProps) => {
  const hardwareData = useHardware((s) => s.hardwareData)

  const displayVariant = model.is_mlx
    ? undefined
    : variant ?? selectDefaultQuant(model.quants, defaultModelQuantizations)

  const fileSizeBytes = model.is_mlx
    ? sumMlxModelBytes(model) || null
    : parseFileSize(displayVariant?.file_size)
  const tier: FitTier = estimateModelFit(
    fileSizeBytes,
    DEFAULT_CTX_LENGTH,
    hardwareData
  )
  const style = TRIGGER_STYLES[tier]
  const Icon = style.icon

  const trigger = children ?? (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium cursor-pointer transition-colors',
        isDefaultVariant ? 'text-xs px-2 py-1' : 'text-[11px] px-1.5 py-0.5',
        style.pill
      )}
      aria-label={`Device compatibility: ${style.label}`}
    >
      <Icon size={isDefaultVariant ? 14 : 12} />
      {isDefaultVariant && <span>{style.label}</span>}
    </button>
  )

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent className="w-80 p-4" side="left">
        <div className="space-y-4">
          <div className="border-b pb-3">
            <h4 className="text-sm font-semibold">
              {!isDefaultVariant ? variant?.model_id : model?.model_name}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {!isDefaultVariant
                ? '模型变体信息'
                : '模型基本信息'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs">
            {!model.is_mlx && (
              <div>
                <span className="text-muted-foreground block">
                  {isDefaultVariant ? '默认量化版本' : '量化版本'}
                </span>
                <span className="font-medium mt-1 inline-block">
                  {extractQuantLabel(displayVariant?.model_id) || 'N/A'}
                </span>
              </div>
            )}

            <div>
              <span className="text-muted-foreground block">
                设备硬件兼容性
              </span>
              <div className="flex items-start gap-2 mt-1">
                <div
                  className={cn(
                    'size-2 shrink-0 rounded-full mt-1',
                    style.dot
                  )}
                />
                <div>
                  <p className="font-medium">{style.label}</p>
                  <p className="text-muted-foreground mt-0.5">{style.detail}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 italic">
                根据模型权重体积与当前硬件配置综合预估。实际性能表现取决于量化精度和上下文长度。
              </p>
            </div>
          </div>

          {((model.num_mmproj ?? 0) > 0 || model.tools) && (
            <div className="border-t pt-3">
              <h5 className="text-xs font-medium text-muted-foreground mb-2">
                功能支持
              </h5>
              <div className="flex flex-wrap gap-2">
                {model.tools && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-sm">
                    <span className="text-xs font-medium">工具调用 (Tools)</span>
                  </div>
                )}
                {(model.num_mmproj ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-sm">
                    <span className="text-xs font-medium">视觉多模态 (Vision)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
