import { requireOrg } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { OrgForm } from "@/components/org-form"
import { TeamTab } from "@/components/team/team-tab"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export const metadata = { title: "Configuración" }

const ORG_EDITOR_ROLES = new Set(["owner", "admin"])
const TEAM_EDITOR_ROLES = new Set(["owner", "admin"])

export default async function ConfiguracionPage() {
  const { org, user } = await requireOrg()
  const canEditOrg = ORG_EDITOR_ROLES.has(org.role)
  const canManageTeam = TEAM_EDITOR_ROLES.has(org.role)

  const supabase = await createClient()

  const [membersRes, invitationsRes, locationsRes] = await Promise.all([
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
  ])

  const members = membersRes.data ?? []
  const invitations = invitationsRes.data ?? []
  const locations = locationsRes.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Datos de tu organización y administración del equipo.
        </p>
      </div>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organización</TabsTrigger>
          <TabsTrigger value="team">
            Equipo {members.length > 0 ? `(${members.length})` : ""}
          </TabsTrigger>
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
      </Tabs>
    </div>
  )
}
