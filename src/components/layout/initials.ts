// Up to two letters from the person's name; a neutral mark until it has loaded
export function initialsOf(name?: string) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "•";
  return (
    words[0]![0]! + (words.length > 1 ? words[words.length - 1]![0]! : "")
  ).toUpperCase();
}
