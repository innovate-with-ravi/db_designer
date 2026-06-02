// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
// instead of importing, we could have directly write data of auth.ts here -> similar to docs

export const { GET, POST } = handlers
// NextAuth automatically generates all the complex routes needed for logging in, logging out, and handling Google's callbacks. We just need to expose them to Next.js.