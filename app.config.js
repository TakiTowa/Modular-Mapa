import 'dotenv/config';

export default {
  expo: {
    name: "niebla-go",
    slug: "niebla-go",  // <-- Quítale el "-hernandez"
    owner: "hernandez.0717",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "nieblago",

    android: {
      package: "com.noody21.nieblago"
    },

    plugins: [
      "expo-router",
      [
        "@rnmapbox/maps"
      ]
    ],

    extra: {
      eas: {
        projectId: "b5b6910d-f86c-4061-83ac-89a6a6542a2a" // <-- El ID nuevo y correcto
      }
    }
  }
};