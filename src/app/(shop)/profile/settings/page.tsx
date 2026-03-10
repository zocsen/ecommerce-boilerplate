"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Eye, EyeOff } from "lucide-react";
import { getProfile, updateProfile, changePassword } from "@/lib/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { ProfileRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Profile settings page (client component)                           */
/* ------------------------------------------------------------------ */

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    getProfile().then((res) => {
      if (res.success && res.data) {
        setProfile(res.data);
        setFullName(res.data.full_name ?? "");
        setPhone(res.data.phone ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setSaving(true);

    const result = await updateProfile({ fullName, phone });

    if (!result.success) {
      setProfileError(result.error ?? "Hiba tortent.");
    } else {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }

    setSaving(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("A ket jelszo nem egyezik.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("A jelszonak legalabb 8 karakter hosszunak kell lennie.");
      return;
    }

    setSavingPassword(true);

    const result = await changePassword({ newPassword });

    if (!result.success) {
      setPasswordError(result.error ?? "Hiba tortent.");
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    }

    setSavingPassword(false);
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Betoltes...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Beallitasok</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Szemelyes adatok es jelszo modositasa.
        </p>
      </div>

      {/* -- Profile info -- */}
      <Card>
        <CardHeader>
          <CardTitle>Szemelyes adatok</CardTitle>
          <CardDescription>A neved es telefonszamod frissitese.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Teljes nev</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Pelda Janos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefonszam</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+36 30 123 4567"
              />
              <p className="text-xs text-muted-foreground">
                Magyar format: +36 XX XXX XXXX
              </p>
            </div>

            {profileError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="rounded-lg border border-green-500/50 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-400">
                Profil sikeresen frissitve.
              </div>
            )}

            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Mentes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* -- Password change -- */}
      <Card>
        <CardHeader>
          <CardTitle>Jelszo modositasa</CardTitle>
          <CardDescription>Valassz egy uj jelszot a fiokodhoz.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Uj jelszo</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Legalabb 8 karakter"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Jelszo megerositese</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Jelszo ujra"
              />
            </div>

            {passwordError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="rounded-lg border border-green-500/50 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-400">
                Jelszo sikeresen megvaltoztatva.
              </div>
            )}

            <Button type="submit" size="sm" disabled={savingPassword}>
              {savingPassword ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Jelszo modositasa
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
