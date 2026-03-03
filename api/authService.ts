// api/authService.ts
// Este archivo simula la autenticación de usuarios usando AsyncStorage.
// Permite registrar nuevos usuarios y hacer login. Los datos se guardan localmente
// Se migrara a un backend real más adelante.

import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_KEY = "APP_USERS";

// Tipo de usuario
interface User {
  username: string;
  email: string;
  password: string;
}

// ================================
// OBTENER USUARIOS
// ================================
async function getUsers(): Promise<User[]> {
  try {
    const saved = await AsyncStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.log("Error getting users:", error);
    return [];
  }
}

// ================================
// GUARDAR USUARIOS
// ================================
async function saveUsers(users: User[]) {
  try {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.log("Error saving users:", error);
  }
}

// ================================
// REGISTRAR USUARIO
// ================================
export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const users = await getUsers();

  // Verificar si ya existe el username
  if (users.find((u) => u.username === username)) {
    return { success: false, message: "El usuario ya existe" };
  }

  // Verificar si ya existe el email
  if (users.find((u) => u.email === email)) {
    return { success: false, message: "El correo ya está registrado" };
  }

  const newUser: User = {
    username,
    email,
    password, // En producción esto debe ir encriptado
  };

  users.push(newUser);
  await saveUsers(users);

  return { success: true, message: "Usuario creado correctamente" };
}

// ================================
// LOGIN USUARIO
// ================================
export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const users = await getUsers();

  const user = users.find((u) => u.username === username);

  if (!user) {
    return { success: false, message: "Usuario no encontrado" };
  }

  if (user.password !== password) {
    return { success: false, message: "Contraseña incorrecta" };
  }

  return { success: true, message: "Login exitoso" };
}