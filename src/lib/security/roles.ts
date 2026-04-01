/* ------------------------------------------------------------------ */
/*  Server-side role check utilities                                   */
/*  Use in Server Components, Server Actions, Route Handlers           */
/* ------------------------------------------------------------------ */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, ProfileRow } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

// ── Get current Supabase user (or null) ────────────────────────────

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ── Get user's profile with role (or null) ─────────────────────────

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return data;
}

// ── Require authentication (redirect to /login if not) ─────────────

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// ── Require specific role(s) ───────────────────────────────────────

export async function requireRole(roles: AppRole[]): Promise<ProfileRow> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    redirect("/login");
  }

  if (!roles.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return profile;
}

// ── Shortcut: require admin ────────────────────────────────────────

export async function requireAdmin(): Promise<ProfileRow> {
  return requireRole(["admin"]);
}

// ── Shortcut: require admin or agency viewer ───────────────────────

export async function requireAdminOrViewer(): Promise<ProfileRow> {
  return requireRole(["admin", "agency_viewer"]);
}

// ── Boolean check: is agency viewer? ───────────────────────────────

export function isAgencyViewer(role: AppRole): boolean {
  return role === "agency_viewer";
}

// ── Boolean check: is agency owner? ───────────────────────────────

export function isAgencyOwner(profile: ProfileRow): boolean {
  return profile.is_agency_owner === true;
}

// ── Require agency owner flag (redirect to /unauthorized if not) ───

export async function requireAgencyOwner(): Promise<ProfileRow> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.is_agency_owner) {
    redirect("/unauthorized");
  }

  return profile;
}
