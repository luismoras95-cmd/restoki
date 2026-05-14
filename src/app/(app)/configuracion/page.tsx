import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { OrgForm } from "@/components/org-form"
import { TeamTab } from "@/components/team/team-tab"
import { BillingTab } from "@/components/billing/billing-tab"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export const metadata = { title: "Configuración" }

const ORG_EDITOR_ROLES = new Set(["owner", "admin"])
const TEAM_EDITOR_ROLES = new Set(["owner", "admin"])
const BILLING_MANAGE_ROLES = new Set(["owner", "admin"])

interface ConfigPageProps {
  searchParams: Promise<{ tab?: string; checkout?: string }>
}

export default async function ConfiguracionPage({
  searchParams,
}: ConfigPageProps) {
  const { org, user } = await requireOrg()
  const params = await searchParams
  const canEditOrg = ORG_EDITOR_ROLES.has(org.role)
  const canManageTeam = TEAM_EDITOR_ROLES.has(org.role)
  const canManageBilling = BILLING_MANAGE_ROLES.has(org.role)

  const defaultTab =
    params.tab === "team" || params.tab === "billing" ? params.tab : "org"

  const supabase = await createClient()

  const [membersRes, invitationsRes, locationsRes, subscriptionRes] =
    await Promise.all([
      supabase.rpc("list_org_members", { p_org_id: org.id }),
      canManageTeam
        ? supabase
            .from("invitations")
            .select(
              "id, email, role, location_id, expires_at, created_at, location:locations(id, name)"
            )
            .eq("organization_id", org.id)
            .is("accepted_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", org.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("subscriptions")
        .select(
          "status, plan, billing_cycle, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id"
        )
        .eq("organization_id", org.id)
        .maybeSingle(),
    ])

  const members = membersRes.data ?? []
  const invitations = invitationsRes.data ?? []
  const locations = locationsRes.data ?? []
  const subscription = subscriptionRes.data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Datos de tu organización, equipo y suscripción.
        </p>
      </div>

      {params.checkout === "success" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          ¡Suscripción activada! Stripe puede tardar unos segundos en
          actualizar el estado. Refresca esta página en un momento si no ves
          el cambio.
        </div>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="org">Organización</TabsTrigger>
          <TabsTrigger value="team">
            Equipo {members.length > 0 ? `(${members.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <div className="rounded-xl border bg-card p-6">
            <OrgForm org={org} canEdit={canEditOrg} />
          </div>
        </TabsContent>

        <TabsContent value="team">
          <TeamTab
            members={members}
            invitations={invitations.map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              location_id: i.location_id,
              location_name: i.location?.name ?? null,
              expires_at: i.expires_at,
              created_at: i.created_at ?? new Date().toISOString(),
            }))}
            locations={locations}
            currentUserId={user.id}
            currentUserRole={org.role}
            canManageTeam={canManageTeam}
          />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab
            subscription={subscription}
            canManage={canManageBilling}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
