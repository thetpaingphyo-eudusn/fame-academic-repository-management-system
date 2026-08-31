const STORAGE_KEY = "fame_teacher_settings";

export const DEFAULT_SETTINGS = {
  emailNotifications: true,
  submissionAlerts: true,
  gradeReminders: false,
  language: "en"
};

export const loadTeacherSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    delete parsed.darkMode;
    return parsed;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveTeacherSettings = (settings) => {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  delete merged.darkMode;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
};
