import { AdminShell } from "@/components/shared/admin-sidebar";
import { getCurrentProfile } from "@/lib/security/roles";
import { getPlanGate } from "@/lib/security/plan-gate";
import { siteConfig } from "@/lib/config/site.config";

/* ------------------------------------------------------------------ */
/*  Admin layout                                                       */
/*  Server component — fetches the user's role + plan features from   */
/*  the session and passes them to AdminShell.                         */
/* ------------------------------------------------------------------ */

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const isAgencyViewer = profile?.role === "agency_viewer";
  const isAgencyOwner = profile?.is_agency_owner === true;

  // Pass site feature flags as a plain object (serializable for client component)
  const enabledFeatures: Record<string, boolean> = { ...siteConfig.features };

  // Resolve active plan features for sidebar lock indicators
  const gate = await getPlanGate();
  const planFeatures: Record<string, boolean | number> | undefined = gate.features
    ? (gate.features as Record<string, boolean | number>)
    : undefined;

  return (
    <AdminShell
      isAgencyViewer={isAgencyViewer}
      isAgencyOwner={isAgencyOwner}
      enableAgencyMode={siteConfig.admin.enableAgencyMode}
      enabledFeatures={enabledFeatures}
      planFeatures={planFeatures}
    >
      {children}
    </AdminShell>
  );
}
