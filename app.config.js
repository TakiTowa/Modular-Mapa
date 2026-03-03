import 'dotenv/config';

export default {
  expo: {
    name: "niebla-go",
    slug: "niebla-go",
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
        projectId: "c108b70f-834b-4c8b-b44f-eb5ca35f733a"
      }
    }
  }
};