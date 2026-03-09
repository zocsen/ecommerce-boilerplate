import { AdminShell } from "@/components/shared/admin-sidebar"
import { getCurrentProfile } from "@/lib/security/roles"

/* ------------------------------------------------------------------ */
/*  Admin layout                                                       */
/*  Server component — fetches the user's role from the session and    */
/*  passes `isAgencyViewer` to the AdminShell for conditional UI.      */
/* ------------------------------------------------------------------ */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()
  const isAgencyViewer = profile?.role === "agency_viewer"

  return <AdminShell isAgencyViewer={isAgencyViewer}>{children}</AdminShell>
}
