export function generateKeywords(title: string): string[] {
  const options = [
    ["stainless steel bottle", "insulated bottle"],
    ["vacuum flask 32oz"],
    ["metal water bottle insulated"]
  ]

  return options[Math.floor(Math.random() * options.length)]
}
