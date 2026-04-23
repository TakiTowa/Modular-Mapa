import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ImageBackground,
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !age || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }
    const result = await registerUser(email, password, firstName, lastName, age);
    if (result.success) {
      Alert.alert("Cuenta creada", "Ahora puedes iniciar sesión");
      router.replace("/login");
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

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Crear cuenta</Text>

        <TextInput
          style={styles.input} placeholder="Nombre" placeholderTextColor="#94a3b8"
          value={firstName} onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input} placeholder="Apellido" placeholderTextColor="#94a3b8"
          value={lastName} onChangeText={setLastName}
        />
        <TextInput
          style={styles.input} placeholder="Edad" placeholderTextColor="#94a3b8"
          keyboardType="numeric" value={age} onChangeText={setAge}
        />
        <TextInput
          style={styles.input} placeholder="Correo electrónico"
          placeholderTextColor="#94a3b8" keyboardType="email-address"
          autoCapitalize="none" value={email} onChangeText={setEmail}
        />

        {/* Contraseña */}
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña" placeholderTextColor="#94a3b8"
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
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirmar contraseña" placeholderTextColor="#94a3b8"
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
          style={({ pressed }) => [styles.mainButton, pressed && { opacity: 0.85 }]}
          onPress={handleRegister}
        >
          <Text style={styles.mainButtonText}>Registrarse</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/login")}>
          <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
        </Pressable>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.45)" },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 30, paddingVertical: 40 },
  title: { fontSize: 32, fontWeight: "bold", color: "#e5e7eb", marginBottom: 30, textAlign: "center" },
  input: {
    backgroundColor: "rgba(15,23,42,0.85)", borderWidth: 1, borderColor: "#334155",
    borderRadius: 14, padding: 15, marginBottom: 15, color: "#e5e7eb",
  },
  passwordRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.85)", borderWidth: 1, borderColor: "#334155",
    borderRadius: 14, marginBottom: 15, paddingRight: 14,
  },
  passwordInput: { flex: 1, padding: 15, color: "#e5e7eb" },
  eyeBtn: { justifyContent: "center", alignItems: "center", padding: 4 },
  mainButton: {
    backgroundColor: "#38bdf8", paddingVertical: 16, borderRadius: 16, alignItems: "center",
    marginTop: 10, marginBottom: 20,
    shadowColor: "#38bdf8", shadowOpacity: 0.9, shadowRadius: 20, elevation: 12,
  },
  mainButtonText: { color: "#020617", fontSize: 17, fontWeight: "700" },
  link: { color: "#22d3ee", textAlign: "center", paddingBottom: 20 },
});