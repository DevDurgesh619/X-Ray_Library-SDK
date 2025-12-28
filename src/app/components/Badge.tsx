type BadgeProps = {
  type: "success" | "error"
  text: string
}

export default function Badge({ type, text }: BadgeProps) {
  const styles =
    type === "success"
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-red-100 text-red-800 border-red-300"

  return (
    <span
      className={`px-2 py-1 text-xs rounded border font-medium ${styles}`}
    >
      {text}
    </span>
  )
}
