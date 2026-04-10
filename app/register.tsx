import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView
} from "react-native";
import { registerUser } from "../api/authService";

export default function RegisterScreen() {
  // Nuevos estados
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async () => {
    if (!firstName || !lastName || !age || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    // Llamamos a la nueva función de Supabase
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

      {/* Usamos ScrollView para que no se corte si la pantalla es pequeña */}
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Crear cuenta</Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor="#94a3b8"
          value={firstName}
          onChangeText={setFirstName}
        />

        <TextInput
          style={styles.input}
          placeholder="Apellido"
          placeholderTextColor="#94a3b8"
          value={lastName}
          onChangeText={setLastName}
        />

        <TextInput
          style={styles.input}
          placeholder="Edad"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
        />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico (@dominio.com)"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar contraseña"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Pressable
          style={({ pressed }) => [
            styles.mainButton,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleRegister}
        >
          <Text style={styles.mainButtonText}>Registrarse</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/login")}>
          <Text style={styles.link}>
            ¿Ya tienes cuenta? Inicia sesión
          </Text>
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
  input: { backgroundColor: "rgba(15,23,42,0.85)", borderWidth: 1, borderColor: "#334155", borderRadius: 14, padding: 15, marginBottom: 15, color: "#e5e7eb" },
  mainButton: { backgroundColor: "#38bdf8", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 10, marginBottom: 20, shadowColor: "#38bdf8", shadowOpacity: 0.9, shadowRadius: 20, elevation: 12 },
  mainButtonText: { color: "#020617", fontSize: 17, fontWeight: "700" },
  link: { color: "#22d3ee", textAlign: "center", paddingBottom: 20 },
});