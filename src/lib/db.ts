import { supabase } from "./supabase";

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data; // { user_id, role, display_name }
}

export async function fetchShootsForUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  // Admin sees all, videographer sees only theirs or assigned
  const profile = await getMyProfile();
  if (profile.role === "admin") {
    const { data, error } = await supabase
      .from("shoots")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("shoots")
      .select("*")
      .or(`owner_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
}

export async function createShootFromTemplate({ name, duration, timeOfDay, locations, notes, assigned_to }: {
  name: string; duration?: number; timeOfDay?: string; locations?: string; notes?: string; assigned_to?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("shoots").insert([{
    owner_id: user!.id,
    assigned_to: assigned_to || null,
    name,
    duration: duration ?? 60,
    time_of_day: timeOfDay ?? "Day",
    locations: locations ?? "",
    notes: notes ?? "",
    status: "Plan"
  }]).select("*").single();
  if (error) throw error;
  return data; // { id, ... }
}

export async function updateShoot(id: string, patch: Record<string, any>) {
  const { error } = await supabase.from("shoots").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteShoot(id: string) {
  const { error } = await supabase.from("shoots").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchScenes(shoot_id: string) {
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("shoot_id", shoot_id)
    .order("position", { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertScene(scene: any) {
  // if scene.id exists -> update, else insert
  if (scene.id) {
    const { error } = await supabase.from("scenes").update(scene).eq("id", scene.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("scenes").insert([scene]);
    if (error) throw error;
  }
}

export async function removeScene(id: string) {
  const { error } = await supabase.from("scenes").delete().eq("id", id);
  if (error) throw error;
}
