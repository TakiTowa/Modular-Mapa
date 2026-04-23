import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { registerUser } from "../api/authService";

export default function RegisterScreen() {
  const [firstName, setFirstName]             = useState("");
  const [lastName, setLastName]               = useState("");
  const [username, setUsername]               = useState("");
  const [age, setAge]                         = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !username || !age || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert("Error", "El nombre de usuario debe tener al menos 3 caracteres");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      Alert.alert("Error", "El nombre de usuario solo puede contener letras, números y _");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    const result = await registerUser(email, password, firstName, lastName, age, username);
    setLoading(false);

    if (result.success) {
      // _layout.tsx detecta el SIGNED_IN y redirige automáticamente al mapa
      // No hace falta navegar manualmente
    } else {
      Alert.alert("Error", result.message);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/fondo-fog-city.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Crear cuenta</Text>

          {/* Nombre */}
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre" placeholderTextColor="#94a3b8"
            value={firstName} onChangeText={setFirstName}
            autoCapitalize="words"
          />

          {/* Apellido */}
          <Text style={styles.label}>Apellido</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu apellido" placeholderTextColor="#94a3b8"
            value={lastName} onChangeText={setLastName}
            autoCapitalize="words"
          />

          {/* Username */}
          <Text style={styles.label}>Nombre de usuario</Text>
          <View style={styles.inputRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.inputFlex}
              placeholder="ej: explorer_gdo" placeholderTextColor="#94a3b8"
              value={username} onChangeText={setUsername}
              autoCapitalize="none" autoCorrect={false}
              maxLength={30}
            />
          </View>
          <Text style={styles.hint}>Solo letras, números y _ · Mínimo 3 caracteres</Text>

          {/* Edad */}
          <Text style={styles.label}>Edad</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu edad" placeholderTextColor="#94a3b8"
            keyboardType="numeric" value={age} onChangeText={setAge}
            maxLength={3}
          />

          {/* Email */}
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com" placeholderTextColor="#94a3b8"
            keyboardType="email-address" autoCapitalize="none"
            value={email} onChangeText={setEmail}
          />

          {/* Contraseña */}
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mínimo 6 caracteres" placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              value={password} onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20} color="#64748b"
              />
            </TouchableOpacity>
          </View>

          {/* Confirmar contraseña */}
          <Text style={styles.label}>Confirmar contraseña</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Repite tu contraseña" placeholderTextColor="#94a3b8"
              secureTextEntry={!showConfirm}
              value={confirmPassword} onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirm((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20} color="#64748b"
              />
            </TouchableOpacity>
          </View>

          <Pressable
            style={({ pressed }) => [styles.mainButton, pressed && { opacity: 0.85 }, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.mainButtonText}>{loading ? "Creando cuenta..." : "Registrarse"}</Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/login")}>
            <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
          </Pressable>

          {/* Espacio extra para que el teclado no tape el botón */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.55)" },
  container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 30, fontWeight: "bold", color: "#e5e7eb", marginBottom: 28, textAlign: "center" },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  hint: { color: "#475569", fontSize: 11, marginBottom: 10, marginTop: -4 },
  input: {
    backgroundColor: "rgba(15,23,42,0.85)", borderWidth: 1, borderColor: "#334155",
    borderRadius: 14, padding: 14, marginBottom: 4, color: "#e5e7eb", fontSize: 15,
  },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.85)", borderWidth: 1, borderColor: "#334155",
    borderRadius: 14, marginBottom: 4, paddingLeft: 14,
  },
  atSign: { color: "#475569", fontSize: 15, fontWeight: "600", marginRight: 2 },
  inputFlex: { flex: 1, padding: 14, color: "#e5e7eb", fontSize: 15 },
  passwordRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.85)", borderWidth: 1, borderColor: "#334155",
    borderRadius: 14, marginBottom: 4, paddingRight: 14,
  },
  passwordInput: { flex: 1, padding: 14, color: "#e5e7eb", fontSize: 15 },
  eyeBtn: { justifyContent: "center", alignItems: "center", padding: 4 },
  mainButton: {
    backgroundColor: "#38bdf8", paddingVertical: 16, borderRadius: 16, alignItems: "center",
    marginTop: 20, marginBottom: 16,
    shadowColor: "#38bdf8", shadowOpacity: 0.9, shadowRadius: 20, elevation: 12,
  },
  mainButtonText: { color: "#020617", fontSize: 17, fontWeight: "700" },
  link: { color: "#22d3ee", textAlign: "center", fontSize: 14 },
});