// A readable device name from a user-agent string, for the sessions list ("Chrome on macOS").
// Order matters: Edge and Opera also say Chrome, and Chrome also says Safari.
const BROWSERS: Array<[RegExp, string]> = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];
const SYSTEMS: Array<[RegExp, string]> = [
  [/Windows/, "Windows"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];
export function describeDevice(userAgent: string | undefined): string {
  if (!userAgent) return "Unknown device";
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? "Unknown device";
}
