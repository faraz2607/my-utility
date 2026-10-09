import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/lib/mongodb";
import { createSessionCookie, ensureSessionSecret, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return Response.json({ error: "Enter your email and password." }, { status: 400 });
    ensureSessionSecret();
    const users = await getUsersCollection();
    const user = await users.findOne({ email });
    if (!user || typeof user.passwordHash !== "string" || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    const response = Response.json({
      user: { id: (user._id as ObjectId).toString(), name: user.name, email: user.email },
    });
    response.headers.set("Set-Cookie", createSessionCookie((user._id as ObjectId).toString()));
    return response;
  } catch (error) {
    console.error("Sign in error:", error);
    const status = error instanceof Error && error.message.includes("SESSION_SECRET") ? 503 : 500;
    return Response.json(
      {
        error:
          status === 503
            ? "Add a 32-character SESSION_SECRET to .env.local."
            : "Sign in is temporarily unavailable. Please try again.",
      },
      { status },
    );
  }
}
