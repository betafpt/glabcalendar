export type Locale = "vi" | "en";

export const messages = {
  vi: {
    nav: {
      today: "Hôm nay",
      calendar: "Lịch",
      projects: "Dự án",
      ai: "AI",
      crew: "Nhân sự",
      gear: "Thiết bị",
    },
    language: {
      label: "Ngôn ngữ",
      vi: "VI",
      en: "EN",
    },
  },
  en: {
    nav: {
      today: "Today",
      calendar: "Calendar",
      projects: "Projects",
      ai: "AI",
      crew: "Crew",
      gear: "Gear",
    },
    language: {
      label: "Language",
      vi: "VI",
      en: "EN",
    },
  },
} as const;

export type Messages = (typeof messages)[Locale];
