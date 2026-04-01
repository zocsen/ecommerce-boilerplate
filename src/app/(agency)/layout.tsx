import { redirect } from "next/navigation"
import { AgencyShell } from "@/components/shared/agency-sidebar"
import { getCurrentProfile, isAgencyOwner } from "@/lib/security/roles"
import { siteConfig } from "@/lib/config/site.config"

/* ------------------------------------------------------------------ */
/*  Agency layout                                                      */
/*  Server component — enforces agency owner + enableAgencyMode.       */
/*  If either check fails the user is redirected away.                 */
/* ------------------------------------------------------------------ */

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  // Gate: agency mode must be enabled in config
  if (!siteConfig.admin.enableAgencyMode) {
    redirect("/admin")
  }

  // Gate: must be authenticated and an agency owner
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login?redirectTo=/agency")
  }

  if (!isAgencyOwner(profile)) {
    redirect("/unauthorized")
  }

  return <AgencyShell>{children}</AgencyShell>
}
