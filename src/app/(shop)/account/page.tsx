/* ------------------------------------------------------------------ */
/*  Account overview — redirects to /account/orders                    */
/* ------------------------------------------------------------------ */

import { redirect } from "next/navigation";

export default function AccountPage() {
  redirect("/account/orders");
}
