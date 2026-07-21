'use client'

import { usePathname } from 'next/navigation'
import { BookOpenIcon, CodeBracketSquareIcon, DocumentArrowDownIcon } from '@heroicons/react/20/solid'
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
import { chapters } from '@/data/chapters'

const GITHUB_URL = 'https://github.com/oclbdk/reflexads'

function AppSidebar({ pathname }: { pathname: string }) {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarItem href="/" current={pathname === '/'}>
          <BookOpenIcon />
          <SidebarLabel className="font-semibold">Reflexads</SidebarLabel>
        </SidebarItem>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          {chapters.map((c) => (
            <SidebarItem
              key={c.slug}
              href={`/chapters/${c.slug}/`}
              current={pathname.startsWith(`/chapters/${c.slug}`)}
            >
              <SidebarLabel>
                <span className="tabular-nums text-zinc-400 dark:text-zinc-500">{c.number}</span>{' '}
                {c.title}
              </SidebarLabel>
            </SidebarItem>
          ))}
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        <SidebarSection>
          <SidebarItem href="/agda/" current={pathname.startsWith('/agda')}>
            <CodeBracketSquareIcon />
            <SidebarLabel>The Agda library</SidebarLabel>
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

export function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarItem href="/">
            <BookOpenIcon />
            <span className="font-semibold">Reflexads</span>
          </NavbarItem>
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
