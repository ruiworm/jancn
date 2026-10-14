import { createFileRoute, redirect } from '@tanstack/react-router'
import { route } from '@/constants/routes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = createFileRoute(route.settings.mcp_servers as any)({
  beforeLoad: () => {
    throw redirect({ to: route.settings.general })
  },
  component: () => null,
})
