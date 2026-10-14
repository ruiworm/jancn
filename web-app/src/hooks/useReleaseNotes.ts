/* eslint-disable @typescript-eslint/no-explicit-any */
// stores/useReleaseStore.ts
import { create } from 'zustand'

type Release = {
  tag_name: string
  prerelease: boolean
  draft: boolean
  [key: string]: any
}

type ReleaseState = {
  release: Release | null
  loading: boolean
  error: string | null
  fetchLatestRelease: (includeBeta: boolean) => Promise<void>
}

export const useReleaseNotes = create<ReleaseState>(() => ({
  release: null,
  loading: false,
  error: null,
  fetchLatestRelease: async () => {
    // Disabled in fork build
  },
}))
