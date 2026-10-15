import { createFileRoute } from '@tanstack/react-router'
import { route } from '@/constants/routes'
import SettingsMenu from '@/containers/SettingsMenu'
import HeaderPage from '@/containers/HeaderPage'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardItem } from '@/containers/Card'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { useGeneralSetting } from '@/hooks/useGeneralSetting'
import { useAppUpdater } from '@/hooks/useAppUpdater'
import { useEffect, useState, useCallback } from 'react'
import ChangeDataFolderLocation from '@/containers/dialogs/ChangeDataFolderLocation'
import { FactoryResetDialog } from '@/containers/dialogs'
import type { FactoryResetOptions } from '@/services/app/types'
import { useServiceHub } from '@/hooks/useServiceHub'
import {
  IconFolder,
  IconLogs,
  IconCopy,
  IconCopyCheck,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { isDev } from '@/lib/utils'
import { SystemEvent } from '@/types/events'
import { Input } from '@/components/ui/input'
import { useHardware } from '@/hooks/useHardware'
import LanguageSwitcher from '@/containers/LanguageSwitcher'
import { isRootDir } from '@/utils/path'
import { hfApiUrl } from '@/lib/hfEndpoint'
const TOKEN_VALIDATION_TIMEOUT_MS = 10_000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute(route.settings.general as any)({
  component: General,
})

function General() {
  const { t } = useTranslation()
  const {
    spellCheckChatInput,
    setSpellCheckChatInput,
    autoUpdateCheck,
    setAutoUpdateCheck,
    showDownloadManager,
    setShowDownloadManager,
    huggingfaceToken,
    setHuggingfaceToken,
  } = useGeneralSetting()
  const serviceHub = useServiceHub()

  const openFileTitle = (): string => {
    if (IS_MACOS) {
      return t('settings:general.showInFinder')
    } else if (IS_WINDOWS) {
      return t('settings:general.showInFileExplorer')
    } else {
      return t('settings:general.openContainingFolder')
    }
  }
  const { checkForUpdate } = useAppUpdater()
  const { pausePolling } = useHardware()
  const [janDataFolder, setJanDataFolder] = useState<string | undefined>()
  const [isCopied, setIsCopied] = useState(false)
  const [selectedNewPath, setSelectedNewPath] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isValidatingToken, setIsValidatingToken] = useState(false)

  useEffect(() => {
    const fetchDataFolder = async () => {
      const path = await serviceHub.app().getJanDataFolder()
      setJanDataFolder(path)
    }

    fetchDataFolder()
  }, [serviceHub])

  const resetApp = async (options: FactoryResetOptions) => {
    if (isRootDir(janDataFolder ?? '/')) {
      toast.error(t('settings:general.couldNotResetRootDirectory'))
      return
    }
    pausePolling()
    await serviceHub.app().factoryReset(options)
  }

  const handleOpenLogs = async () => {
    try {
      await serviceHub.window().openLogsWindow()
    } catch (error) {
      console.error('Failed to open logs window:', error)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleDataFolderChange = async () => {
    const selectedPath = await serviceHub.dialog().open({
      multiple: false,
      directory: true,
      defaultPath: janDataFolder,
    })

    if (selectedPath === janDataFolder) return
    if (selectedPath !== null) {
      setSelectedNewPath(selectedPath as string)
      setIsDialogOpen(true)
    }
  }

  const confirmDataFolderChange = async () => {
    if (selectedNewPath) {
      try {
        await serviceHub.models().stopAllModels()
        serviceHub.events().emit(SystemEvent.KILL_SIDECAR)
        setTimeout(async () => {
          try {
            // Prevent relocating to root directory (e.g., C:\ or D:\ on Windows, / on Unix)
            if (isRootDir(selectedNewPath))
              throw new Error(t('settings:general.couldNotRelocateToRoot'))
            await serviceHub.app().relocateJanDataFolder(selectedNewPath)
            setJanDataFolder(selectedNewPath)
            // Only relaunch if relocation was successful
            window.core?.api?.relaunch()
            setSelectedNewPath(null)
            setIsDialogOpen(false)
          } catch (error) {
            console.error(error)
            toast.error(
              error instanceof Error
                ? error.message
                : t('settings:general.failedToRelocateDataFolder')
            )
          }
        }, 1000)
      } catch (error) {
        console.error('Failed to relocate data folder:', error)
        // Revert the data folder path on error
        const originalPath = await serviceHub.app().getJanDataFolder()
        setJanDataFolder(originalPath)

        toast.error(t('settings:general.failedToRelocateDataFolderDesc'))
      }
    }
  }

  const handleCheckForUpdate = useCallback(async () => {
    setIsCheckingUpdate(true)
    try {
      if (isDev()) return toast.info(t('settings:general.devVersion'))
      const update = await checkForUpdate(true)
      if (!update) {
        toast.info(t('settings:general.noUpdateAvailable'))
      }
      // If update is available, the AppUpdater dialog will automatically show
    } catch (error) {
      console.error('Failed to check for updates:', error)
      toast.error(t('settings:general.updateError'))
    } finally {
      setIsCheckingUpdate(false)
    }
  }, [t, checkForUpdate])

  return (
    <div className="flex flex-col h-svh w-full">
      <HeaderPage>
        <div className="flex items-center gap-2 w-full">
          <span className='font-medium text-base font-studio'>{t('common:settings')}</span>
        </div>
      </HeaderPage>
      <div className="flex h-[calc(100%-60px)]">
        <SettingsMenu />
        <div className="p-4 pt-0 w-full overflow-y-auto">
          <div className="flex flex-col justify-between gap-4 gap-y-3 w-full">

            {/* General */}
            <Card title={t('common:general')}>
              <CardItem
                title={t('settings:general.appVersion')}
                actions={
                  <span className="text-foreground font-medium">
                    v{VERSION}
                  </span>
                }
              />
              {!AUTO_UPDATER_DISABLED && (
                <>
                  <CardItem
                    title={t('settings:general.autoUpdateCheck')}
                    description={t('settings:general.autoUpdateCheckDesc')}
                    className="items-center flex-row gap-y-2"
                    actions={
                      <Switch
                        checked={autoUpdateCheck}
                        onCheckedChange={(e) => setAutoUpdateCheck(e)}
                      />
                    }
                  />
                  <CardItem
                    title={t('settings:general.checkForUpdates')}
                    description={t('settings:general.checkForUpdatesDesc')}
                    className="items-center flex-row gap-y-2"
                    actions={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCheckForUpdate}
                        disabled={isCheckingUpdate}
                      >
                        {isCheckingUpdate
                          ? t('settings:general.checkingForUpdates')
                          : t('settings:general.checkForUpdates')}
                      </Button>
                    }
                  />
                </>
              )}
              <CardItem
                title={t('common:language')}
                actions={<LanguageSwitcher />}
              />
              <CardItem
                title={t('settings:general.showDownloadManager', {
                  defaultValue: '显示下载中心',
                })}
                description={t('settings:general.showDownloadManagerDesc', {
                  defaultValue:
                    '在顶栏与侧边栏显示模型下载进度图标。下载完成后可在此关闭以保持界面极简干净。',
                })}
                className="items-center flex-row gap-y-2"
                actions={
                  <Switch
                    checked={showDownloadManager}
                    onCheckedChange={(e) => setShowDownloadManager(e)}
                  />
                }
              />
            </Card>

            {/* Data folder - Desktop only */}
            <Card title={t('common:dataFolder')}>
              <CardItem
                title={t('settings:dataFolder.appData', {
                  ns: 'settings',
                })}
                align="start"
                className="items-start flex-row gap-2"
                description={
                  <>
                    <span>
                      {t('settings:dataFolder.appDataDesc', {
                        ns: 'settings',
                      })}
                      &nbsp;
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="max-w-100 bg-secondary rounded-sm px-1 py-0.5">
                        <span
                          data-testid="app-data-folder-path"
                          title={janDataFolder}
                          className="text-xs line-clamp-1 break-all"
                        >
                          {janDataFolder}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          janDataFolder && copyToClipboard(janDataFolder)
                        }
                        className="cursor-pointer flex items-center justify-center rounded-sm bg-secondary transition-all duration-200 ease-in-out p-1"
                        title={
                          isCopied
                            ? t('settings:general.copied')
                            : t('settings:general.copyPath')
                        }
                      >
                        {isCopied ? (
                          <div className="flex items-center gap-1">
                            <IconCopyCheck size={14} className="text-green-500 dark:text-green-600" />
                            <span className="text-xs leading-0">
                              {t('settings:general.copied')}
                            </span>
                          </div>
                        ) : (
                          <IconCopy
                            size={14}
                            className="text-muted-foreground"
                          />
                        )}
                      </button>
                    </div>
                  </>
                }
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      title={t('settings:dataFolder.appData')}
                      onClick={handleDataFolderChange}
                    >
                        <IconFolder
                          size={12}
                          className="text-muted-foreground"
                        />
                        <span>{t('settings:general.changeLocation')}</span>
                    </Button>
                    {selectedNewPath && (
                      <ChangeDataFolderLocation
                        currentPath={janDataFolder || ''}
                        newPath={selectedNewPath}
                        onConfirm={confirmDataFolderChange}
                        open={isDialogOpen}
                        onOpenChange={(open) => {
                          setIsDialogOpen(open)
                          if (!open) {
                            setSelectedNewPath(null)
                          }
                        }}
                      >
                        <div />
                      </ChangeDataFolderLocation>
                    )}
                  </>
                }
              />
              <CardItem
                title={t('settings:dataFolder.appLogs', {
                  ns: 'settings',
                })}
                description={t('settings:dataFolder.appLogsDesc')}
                className="items-start flex-row gap-y-2"
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-0"
                      onClick={async () => {
                        if (janDataFolder) {
                          try {
                            const logsPath = await serviceHub.path().join(
                              janDataFolder,
                              'logs'
                            )
                            await serviceHub.opener().openPath(logsPath)
                          } catch (error) {
                            console.error(
                              'Failed to reveal logs folder:',
                              error
                            )
                          }
                        }
                      }}
                      title={t('settings:general.revealLogs')}
                    >
                      <IconFolder
                        size={12}
                        className="text-muted-foreground"
                      />
                      <span>{openFileTitle()}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenLogs}
                      title={t('settings:dataFolder.appLogs')}
                    >
                      <IconLogs size={12} className="text-muted-foreground" />
                      <span>{t('settings:general.openLogs')}</span>
                    </Button>
                  </div>
                }
              />
            </Card>

            {/* Advanced */}
            <Card title={t('settings:general.advanced', { defaultValue: '高级设置' })}>
              <CardItem
                title={t('settings:others.resetFactory', {
                  ns: 'settings',
                })}
                description={t('settings:others.resetFactoryDesc', {
                  ns: 'settings',
                })}
                actions={
                  <FactoryResetDialog onReset={resetApp}>
                    <Button variant="destructive" size="sm">
                      {t('common:reset')}
                    </Button>
                  </FactoryResetDialog>
                }
              />
            </Card>

            {/* Other */}
            <Card title={t('common:others')}>
              <CardItem
                title={t('settings:others.spellCheck', {
                  ns: 'settings',
                })}
                description={t('settings:others.spellCheckDesc', {
                  ns: 'settings',
                })}
                actions={
                  <Switch
                    checked={spellCheckChatInput}
                    onCheckedChange={(e) => setSpellCheckChatInput(e)}
                  />
                }
              />
              <CardItem
                title={t('settings:general.huggingfaceToken', {
                  ns: 'settings',
                })}
                description={t('settings:general.huggingfaceTokenDesc', {
                  ns: 'settings',
                })}
                actions={
                  <div className="flex items-center gap-2">
                    <Input
                      id="hf-token"
                      value={huggingfaceToken || ''}
                      onChange={(e) => setHuggingfaceToken(e.target.value)}
                      placeholder={'hf_xxx_xxx'}
                      required
                    />
                    <Button
                      variant="outline"
                      size='sm'
                      disabled={isValidatingToken}
                      onClick={async () => {
                        const token = (huggingfaceToken || '').trim()
                        if (!token) {
                          toast.error(
                            t('settings:general.enterTokenPrompt', {
                              defaultValue: '请输入 Hugging Face 令牌进行验证',
                            })
                          )
                          return
                        }
                        setIsValidatingToken(true)
                        const controller = new AbortController()
                        const timeoutId = setTimeout(
                          () => controller.abort(),
                          TOKEN_VALIDATION_TIMEOUT_MS
                        )
                        try {
                          const resp = await fetch(
                            hfApiUrl('/api/whoami-v2'),
                            {
                              headers: { Authorization: `Bearer ${token}` },
                              signal: controller.signal,
                            }
                          )
                          if (resp.ok) {
                            const data = await resp.json()
                            toast.success(
                              t('settings:general.tokenValid', {
                                defaultValue: '令牌有效',
                              }),
                              {
                                description: data?.name
                                  ? t('settings:general.signedInAs', {
                                      defaultValue: `已登录为 ${data.name}`,
                                      name: data.name,
                                    })
                                  : t('settings:general.tokenValidDesc', {
                                      defaultValue: '您的 Hugging Face 令牌有效。',
                                    }),
                              }
                            )
                          } else {
                            toast.error(
                              t('settings:general.tokenInvalid', {
                                defaultValue: '令牌无效',
                              }),
                              {
                                description: t(
                                  'settings:general.tokenInvalidDesc',
                                  {
                                    defaultValue:
                                      '提供的 Hugging Face 令牌无效，请检查并重试。',
                                  }
                                ),
                              }
                            )
                          }
                        } catch (e) {
                          const name = (e as { name?: string })?.name
                          if (name === 'AbortError') {
                            toast.error(
                              t('settings:general.tokenTimeout', {
                                defaultValue: '验证超时',
                              }),
                              {
                                description: t(
                                  'settings:general.tokenTimeoutDesc',
                                  {
                                    defaultValue:
                                      '验证请求超时，请检查网络连接并重试。',
                                  }
                                ),
                              }
                            )
                          } else {
                            toast.error(
                              t('settings:general.tokenFailed', {
                                defaultValue: '验证失败',
                              }),
                              {
                                description: t(
                                  'settings:general.tokenFailedDesc',
                                  {
                                    defaultValue:
                                      '验证令牌时发生网络错误，请检查网络连接。',
                                  }
                                ),
                              }
                            )
                          }
                        } finally {
                          clearTimeout(timeoutId)
                          setIsValidatingToken(false)
                        }
                      }}
                    >
                      {t('common:verify', { defaultValue: '验证' })}
                    </Button>
                  </div>
                }
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
