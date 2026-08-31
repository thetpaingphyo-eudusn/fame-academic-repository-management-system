import React, { createContext, useContext, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadTeacherSettings,
  saveTeacherSettings
} from "../utils/teacherSettings";

const SettingsContext = createContext(null);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => loadTeacherSettings());

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveTeacherSettings(next);
      return next;
    });
  };

  const updateSettings = (partial) => {
    setSettings((prev) => saveTeacherSettings({ ...prev, ...partial }));
  };

  const resetSettings = () => {
    setSettings(saveTeacherSettings(DEFAULT_SETTINGS));
  };

  return (
    <SettingsContext.Provider
      value={{ settings, updateSetting, updateSettings, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
