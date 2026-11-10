/**
 * How this browser can be asked for course files.
 *
 * native        the File System Access folder picker: one click to reopen, folders keep their structure.
 * folder-input  the older <input webkitdirectory>: folders work, but the browser asks again each visit.
 * files         touch devices without a folder picker (iPhone, iPad, Firefox on Android): the visitor
 *               chooses the files themselves. Folders cannot be read, so there are no chapters.
 */
export type PickerMode = "native" | "folder-input" | "files";

export interface PickerEnv {
  hasNativePicker: boolean;
  secureContext: boolean;
  topLevel: boolean;
  touch: boolean;
}

export function pickerMode(env: PickerEnv): PickerMode {
  // The native picker is refused inside frames, which is how a hosted preview runs.
  if (env.hasNativePicker && env.secureContext && env.topLevel) return "native";
  return env.touch ? "files" : "folder-input";
}

export function detectPickerEnv(): PickerEnv {
  let topLevel = true;
  try { topLevel = window.self === window.top; } catch { topLevel = false; }
  return {
    hasNativePicker: typeof window.showDirectoryPicker === "function",
    secureContext: window.isSecureContext,
    topLevel,
    touch: (window.matchMedia?.("(pointer: coarse)").matches ?? false) && navigator.maxTouchPoints > 0,
  };
}

/** One honest sentence for the visitor, or null when everything works. */
export function pickerNote(mode: PickerMode): string | null {
  if (mode === "native") return null;
  if (mode === "folder-input") return "This browser opens folders but cannot remember them, so you will choose the folder again each visit. Your progress still comes back.";
  return "Phones and tablets cannot always open folders. Choose the course’s files instead and they will be grouped by name. Chapters need folders, so everything lands in one list. Chrome on Android (version 132 or newer) can open whole folders; iPhones and iPads cannot.";
}
