import { getUsersCollection } from "@/lib/mongodb";
import { createSessionCookie, ensureSessionSecret, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) {
      return Response.json({ error: "Enter your name, a valid email, and a password between 8 and 128 characters." }, { status: 400 });
    }
    ensureSessionSecret();
    const users = await getUsersCollection();
    await users.createIndex({ email: 1 }, { unique: true });
    if (await users.findOne({ email })) return Response.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
    const createdAt = new Date();
    const result = await users.insertOne({ name, email, passwordHash: await hashPassword(password), createdAt });
    const response = Response.json({ user: { id: result.insertedId.toString(), name, email } }, { status: 201 });
    response.headers.set("Set-Cookie", createSessionCookie(result.insertedId.toString()));
    return response;
  } catch (error) {
    console.error("Sign up error:", error);
    const status = error instanceof Error && error.message.includes("SESSION_SECRET") ? 503 : 500;
    return Response.json({ error: status === 503 ? "Add a 32-character SESSION_SECRET to .env.local." : "The account could not be created. Please try again." }, { status });
  }
}
