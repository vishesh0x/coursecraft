import { describe, expect, it } from "vitest";
import { pickerMode, pickerNote } from "./capability";

const base = { hasNativePicker: true, secureContext: true, topLevel: true, touch: false };

describe("pickerMode", () => {
  it("uses the native picker when it is available, secure and not framed", () => {
    expect(pickerMode(base)).toBe("native");
    expect(pickerMode({ ...base, touch: true })).toBe("native"); // Chrome on Android 132+
  });
  it("falls back to folder input on desktop browsers without the picker", () => {
    expect(pickerMode({ ...base, hasNativePicker: false })).toBe("folder-input");
  });
  it("falls back to choosing files on touch devices without the picker", () => {
    expect(pickerMode({ ...base, hasNativePicker: false, touch: true })).toBe("files");
  });
  it("refuses the native picker inside a frame or an insecure page", () => {
    expect(pickerMode({ ...base, topLevel: false })).toBe("folder-input");
    expect(pickerMode({ ...base, secureContext: false, touch: true })).toBe("files");
  });
  it("only has something to say when the folder picker is not available", () => {
    expect(pickerNote("native")).toBeNull();
    expect(pickerNote("files")).toMatch(/iPhones and iPads cannot/);
    expect(pickerNote("folder-input")).toMatch(/again each visit/);
  });
});
