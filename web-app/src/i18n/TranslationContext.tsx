import React, { ReactNode, useEffect, useCallback } from "react"
import i18next, { loadTranslations } from "./setup"
import { useGeneralSetting } from "@/hooks/useGeneralSetting"
import { TranslationContext } from "./context"
import { isPlatformTauri } from "@/lib/platform/utils"

// Translation provider component
export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	// Get the current language from general settings
	const { currentLanguage } = useGeneralSetting()

	// Load translations once when the component mounts
	useEffect(() => {
		try {
			loadTranslations()
		} catch (error) {
			console.error("Failed to load translations:", error)
		}
	}, [])

	// Update language when currentLanguage changes
	useEffect(() => {
		if (currentLanguage) {
			i18next.changeLanguage(currentLanguage)
		}
	}, [currentLanguage])

	// The system tray menu is native OS chrome, so it cannot read the locale
	// files. Push the active language down so its labels are translated too;
	// without this the tray stays English in every language.
	useEffect(() => {
		if (!currentLanguage || !isPlatformTauri()) return
		import("@tauri-apps/api/core")
			.then(({ invoke }) => invoke("set_tray_language", { language: currentLanguage }))
			.catch((err) => console.error("set_tray_language failed:", err))
	}, [currentLanguage])

	// Memoize the translation function to prevent unnecessary re-renders
	const translate = useCallback(
		(key: string, options?: Record<string, unknown>) => {
			return i18next.t(key, options)
		},
		[],
	)

	return (
		<TranslationContext.Provider
			value={{
				t: translate,
				i18n: i18next,
			}}>
			{children}
		</TranslationContext.Provider>
	)
}

export default TranslationProvider
