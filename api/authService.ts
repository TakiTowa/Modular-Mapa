// api/authService.ts
import { supabase } from "./supabase";

// ================================
// REGISTRAR USUARIO
// ================================
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  age: string
): Promise<{ success: boolean; message: string }> {

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { success: false, message: error.message };

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        age: parseInt(age),
        total_xp: 0,
      },
    ]);

    if (profileError) {
      console.error("Error creando perfil:", profileError);
      return {
        success: false,
        message: "Usuario creado, pero hubo un error al guardar el perfil.",
      };
    }
  }

  return { success: true, message: "Usuario creado correctamente" };
}

// ================================
// LOGIN USUARIO
// ================================
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { success: false, message: error.message };

  return { success: true, message: "Login exitoso" };
}

// ================================
// LOGOUT USUARIO
// ================================
// Llama a esto desde el menú del mapa para cerrar sesión.
// El onAuthStateChange en _layout.tsx detectará el cambio
// y redirigirá automáticamente al login.
export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.auth.signOut();

  if (error) return { success: false, message: error.message };

  return { success: true, message: "Sesión cerrada" };
}

// ================================
// OBTENER DATOS DEL PERFIL
// ================================
export async function getFullUserData() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return error ? null : data;
}