import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Shared frame for tool cards, in the Quivr style. */
export function Card({ title, subtitle, children }: Props) {
  return (
    <div className="bg-surface overflow-hidden rounded-md shadow-sm">
      <div className="bg-sidenav-blue flex items-baseline justify-between px-3 py-1.5 text-white">
        <span className="font-title text-xl tracking-wide">{title}</span>
        {subtitle && <span className="text-xs opacity-80">{subtitle}</span>}
      </div>
      <div className="p-3 text-sm">{children}</div>
    </div>
  )
}
