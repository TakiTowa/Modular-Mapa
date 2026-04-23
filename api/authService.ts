// api/authService.ts
import { supabase } from "./supabase";

// ================================
// REGISTRAR USUARIO
// Crea la cuenta, inserta el perfil y hace login automático
// ================================
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  age: string,
  username: string
): Promise<{ success: boolean; message: string }> {

  // 1. Verificar que el username no esté en uso
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.trim())
    .maybeSingle();

  if (existing) {
    return { success: false, message: "Ese nombre de usuario ya está en uso." };
  }

  // 2. Crear cuenta en auth
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { success: false, message: error.message };

  // 3. Insertar perfil
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert([{
      id: data.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      username: username.trim(),
      age: parseInt(age),
      total_xp: 0,
    }]);

    if (profileError) {
      console.error("Error creando perfil:", profileError);
      return { success: false, message: "Usuario creado pero hubo un error al guardar el perfil." };
    }
  }

  // 4. Login automático — la sesión ya está activa desde signUp en Supabase
  // onAuthStateChange en _layout.tsx detectará el SIGNED_IN y redirigirá al mapa
  return { success: true, message: "Cuenta creada correctamente" };
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
export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase.auth.signOut();

  if (error) return { success: false, message: error.message };

  return { success: true, message: "Sesión cerrada" };
}

// ================================
// OBTENER DATOS DEL PERFIL
// ================================
export async function getFullUserData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return error ? null : data;
}