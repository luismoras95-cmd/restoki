import { requireOrg } from "@/lib/auth"
import { getUserOrgs } from "@/lib/auth"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { OrgSwitcher } from "@/components/org-switcher"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, org } = await requireOrg()
  const orgs = await getUserOrgs()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader userEmail={user.email ?? ""} />
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
          <div className="border-b p-3">
            <OrgSwitcher current={org} orgs={orgs} />
          </div>
          <AppSidebar />
        </aside>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
