import { texts } from './i18n'

export const r0 = (n: number) => Math.round(n)
export const r1 = (n: number) => Math.round(n * 10) / 10
export const thousands = (n: number) => r0(n).toLocaleString(texts().locale)
