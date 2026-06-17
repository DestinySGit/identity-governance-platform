import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/types/database.types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) {
    throw new Error("Unauthorized");
  }
  return profile;
}

export async function requireRole(roles: AppRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) {
    throw new Error("Forbidden");
  }
  return profile;
}

export function canWrite(profile: Profile): boolean {
  return profile.role === "admin";
}

export function canReview(profile: Profile): boolean {
  return profile.role === "admin" || profile.role === "reviewer";
}
