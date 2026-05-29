import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class strings deterministically, deduplicating
 * conflicting utilities (later wins) and dropping falsy values.
 *
 * @example
 *   cn('px-2 py-1', isActive && 'bg-blue-500')
 *   cn({ 'opacity-50': disabled }, className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
