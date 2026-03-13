import { AdminShell } from "@/components/shared/admin-sidebar"
import { getCurrentProfile } from "@/lib/security/roles"
import { siteConfig } from "@/lib/config/site.config"

/* ------------------------------------------------------------------ */
/*  Admin layout                                                       */
/*  Server component — fetches the user's role from the session and    */
/*  passes `isAgencyViewer` + feature flags to the AdminShell.         */
/* ------------------------------------------------------------------ */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()
  const isAgencyViewer = profile?.role === "agency_viewer"

  // Pass features as a plain object (serializable for client component)
  const enabledFeatures: Record<string, boolean> = { ...siteConfig.features }

  return (
    <AdminShell isAgencyViewer={isAgencyViewer} enabledFeatures={enabledFeatures}>
      {children}
    </AdminShell>
  )
}
