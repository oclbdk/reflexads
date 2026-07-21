import '@/styles/tailwind.css'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ApplicationLayout } from './application-layout'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s · Reflexads',
    default: 'Reflexads',
  },
  description:
    'An interactive guide that explores how engineers can reason about looping effects in computational workflows, like AI contexts that feed code, prose, and data sources back into their own operations.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} text-zinc-950 antialiased lg:bg-sand dark:bg-zinc-900 dark:text-white dark:lg:bg-zinc-950`}
    >
      <body>
        <ApplicationLayout>{children}</ApplicationLayout>
      </body>
    </html>
  )
}
