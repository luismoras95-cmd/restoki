import { getSubscriptionAccess, getUserOrgs, requireOrg } from "@/lib/auth"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { OrgSwitcher } from "@/components/org-switcher"
import { TrialBanner } from "@/components/billing/trial-banner"

const BILLING_MANAGE_ROLES = new Set(["owner", "admin"])

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, org } = await requireOrg()
  const [orgs, access] = await Promise.all([
    getUserOrgs(),
    getSubscriptionAccess(),
  ])
  const canManageBilling = BILLING_MANAGE_ROLES.has(org.role)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader userEmail={user.email ?? ""} />
      <TrialBanner access={access} canManageBilling={canManageBilling} />
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
