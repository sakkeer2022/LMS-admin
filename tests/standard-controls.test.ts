import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The settings-style screens once had their own Input, Select, Button, Dialog and Field. They use the standard
// controls now (components/shadcn, components/forms). This fails if one of the old names comes back.
const RETIRED = [
  "SettingInput",
  "SettingSelect",
  "SettingButton",
  "SettingPill",
  "SettingDialog",
  "SettingField",
  "SettingForm",
  "SettingEmpty",
  "SettingPasswordInput",
  "SettingPhoneInput",
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

describe("standard controls", () => {
  it("does not bring back the retired Setting* controls", () => {
    const root = join(__dirname, "../src");
    const found = files(root).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return RETIRED.filter((name) => new RegExp(`\\b${name}\\b`).test(source)).map((name) => `${path.slice(root.length + 1)}: ${name}`);
    });
    expect(found, "Use Input, PhoneInput, NativeSelect, Button/PendingButton, Badge/StatusBadge, FormDialog, Field/TextField/PasswordField, Form instead").toEqual([]);
  });
});
