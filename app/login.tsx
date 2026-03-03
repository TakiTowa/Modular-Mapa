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
} from "react-native";
import { loginUser } from "../api/authService";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }

    const result = await loginUser(username, password);

    if (result.success) {
      Alert.alert("Bienvenido", "Login exitoso");
      router.replace("/map");
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

      <View style={styles.container}>
        <Text style={styles.title}>Iniciar sesión</Text>

        <TextInput
          style={styles.input}
          placeholder="Usuario"
          placeholderTextColor="#94a3b8"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={({ pressed }) => [
            styles.mainButton,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleLogin}
        >
          <Text style={styles.mainButtonText}>Entrar</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/register")}>
          <Text style={styles.link}>
            ¿No tienes cuenta? Regístrate
          </Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.45)",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#e5e7eb",
    marginBottom: 40,
    textAlign: "center",
  },

  input: {
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    padding: 15,
    marginBottom: 18,
    color: "#e5e7eb",
  },

  mainButton: {
    backgroundColor: "#38bdf8",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,

    shadowColor: "#38bdf8",
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 12,
  },

  mainButtonText: {
    color: "#020617",
    fontSize: 17,
    fontWeight: "700",
  },

  link: {
    color: "#22d3ee",
    textAlign: "center",
  },
});