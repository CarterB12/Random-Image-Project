import { RandomImage } from "@/components/random-image"

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <RandomImage />
    </main>
  )
}
