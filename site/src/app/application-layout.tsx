'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowsRightLeftIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CodeBracketSquareIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/20/solid'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/sidebar'
import { SidebarLayout } from '@/components/sidebar-layout'
import { chapterHref, chapters } from '@/data/chapters'
import { introSections } from '@/data/intro-sections'

const GITHUB_URL = 'https://github.com/oclbdk/reflexads'

function StatusBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-reflex-500/10 px-3 py-1.5 text-xs font-medium text-reflex-700 ring-1 ring-reflex-500/20 dark:text-reflex-500">
      <span className="size-1.5 rounded-full bg-reflex-500" />
      under open development
    </span>
  )
}

function AppSidebar({ pathname }: { pathname: string }) {
  return (
    <Sidebar>
      <SidebarHeader>
        {/* The brand wordmark is a special case, not a nav item: it never wears
            the chapter "selected" highlight. It warms to the accent on hover,
            and on home the mark alone sits in the accent as a quiet "you are here". */}
        {/* The brand wordmark stays black at all times; only a hover background
            tint marks it, and that never persists after the mouse leaves. */}
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-base/6 font-semibold text-zinc-950 hover:bg-reflex-500/5 sm:py-2 sm:text-sm/5 dark:text-white"
        >
          <BookOpenIcon className="size-6 shrink-0 sm:size-5" />
          Reflexads
        </Link>
        <div className="mt-2 px-2">
          <StatusBadge />
        </div>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          {chapters.map((c) => (
            <div key={c.slug}>
              <SidebarItem
                href={chapterHref(c.slug)}
                current={c.slug !== 'introduction' && pathname.startsWith(`/chapters/${c.slug}`)}
              >
                <SidebarLabel>
                  <span className="mr-2.5 tabular-nums text-zinc-500 dark:text-zinc-400">{c.number}</span>
                  {c.title}
                </SidebarLabel>
              </SidebarItem>
              {c.slug === 'introduction' && (
                <div className="ml-4 border-l border-zinc-950/5 pl-1 dark:border-white/10">
                  {introSections.map((s, i) => (
                    <SidebarItem
                      key={s.slug}
                      href={`/chapters/introduction/${s.slug}/`}
                      current={pathname.startsWith(`/chapters/introduction/${s.slug}`)}
                    >
                      <SidebarLabel className="text-xs/5 sm:text-xs/5">
                        <span className="mr-2 font-mono text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                          1.{i + 1}
                        </span>
                        {s.title}
                      </SidebarLabel>
                    </SidebarItem>
                  ))}
                </div>
              )}
            </div>
          ))}
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        <SidebarSection>
          <SidebarItem href="/agda/" current={pathname.startsWith('/agda')}>
            <CodeBracketSquareIcon />
            <SidebarLabel>The Agda library</SidebarLabel>
          </SidebarItem>
          {/* /contribute is its own site — the book always opens it in a new page */}
          <SidebarItem href="/contribute/" target="_blank">
            <ArrowsRightLeftIcon />
            <SidebarLabel className="flex items-center gap-1.5">
              Contributing
              <ArrowTopRightOnSquareIcon className="size-3.5 text-zinc-400 dark:text-zinc-500" />
            </SidebarLabel>
          </SidebarItem>
          <SidebarItem href={GITHUB_URL} target="_blank">
            <DocumentArrowDownIcon />
            <SidebarLabel>Source &amp; PDF</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarFooter>
    </Sidebar>
  )
}

// The /contribute mini-site wears its own chrome: no book sidebar, its own
// wordmark, and a marked, new-page link back to the book. The book's links to
// it are marked the same way — two sites, one repo. Its source links come
// from the serving repo's own remote (extracted at build time), so a fork's
// guide points at the fork — the page never names any particular instance.
function ContributeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-paper dark:bg-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-950/5 bg-paper/90 backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-3">
          <Link
            href="/contribute/"
            className="flex items-center gap-2 text-sm/5 font-semibold text-zinc-950 dark:text-white"
          >
            <ArrowsRightLeftIcon className="size-5 shrink-0" />
            Contributor&rsquo;s Guide
          </Link>
          <Link
            href="/"
            target="_blank"
            className="ml-auto flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
          >
            <BookOpenIcon className="size-4" />
            Reflexads
            <ArrowTopRightOnSquareIcon className="size-3.5 text-zinc-400 dark:text-zinc-500" />
          </Link>
        </div>
      </header>
      <div className="px-6 py-10 lg:py-14">{children}</div>
    </div>
  )
}

export function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/contribute')) {
    return <ContributeShell>{children}</ContributeShell>
  }
  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarItem href="/">
            <BookOpenIcon />
            <span className="font-semibold">Reflexads</span>
          </NavbarItem>
          <div className="ml-2">
            <StatusBadge />
          </div>
          <NavbarSpacer />
          <NavbarSection>
            <NavbarItem href={GITHUB_URL} target="_blank" aria-label="Source">
              <CodeBracketSquareIcon />
            </NavbarItem>
          </NavbarSection>
        </Navbar>
      }
      sidebar={<AppSidebar pathname={pathname} />}
    >
      {children}
    </SidebarLayout>
  )
}
