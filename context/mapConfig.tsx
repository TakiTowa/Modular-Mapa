// context/MapSettingsContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getMapSettings, saveMapSettings } from "../api/mapSettingsService";

type MapSettings = {
  mapStyle: string;
  fogColor: string;
  setMapStyle: (style: string) => void;
  setFogColor: (color: string) => void;
};

const MapSettingsContext = createContext<MapSettings | undefined>(undefined);

export const MapSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mapStyle, setMapStyleState] = useState<string>("standard");
  const [fogColor, setFogColorState] = useState<string>("#000000");

  // Carga inicial
  useEffect(() => {
    (async () => {
      const settings = await getMapSettings();
      setMapStyleState(settings.mapStyle);
      setFogColorState(settings.fogColor);
    })();
  }, []);

  const setMapStyle = (style: string) => {
    setMapStyleState(style);
    saveMapSettings(style, fogColor);
  };

  const setFogColor = (color: string) => {
    setFogColorState(color);
    saveMapSettings(mapStyle, color);
  };

  return (
    <MapSettingsContext.Provider
      value={{ mapStyle, fogColor, setMapStyle, setFogColor }}
    >
      {children}
    </MapSettingsContext.Provider>
  );
};

// Hook personalizado para usar en componentes
export const useMapSettings = () => {
  const context = useContext(MapSettingsContext);
  if (!context) {
    throw new Error("useMapSettings must be used within MapSettingsProvider");
  }
  return context;
};