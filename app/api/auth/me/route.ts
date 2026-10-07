import { getUsersCollection } from "@/lib/mongodb";
import { readSession } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const session = readSession(request);
    if (!session || !ObjectId.isValid(session.userId)) return Response.json({ error: "Not signed in." }, { status: 401 });
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(session.userId) });
    if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
    return Response.json({ user: { id: user._id.toString(), name: user.name, email: user.email } });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && error.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;
    console.error("Session check error:", error);
    const status = error instanceof Error && (error.message.includes("SESSION_SECRET") || error.message.includes("MONGODB_URI")) ? 503 : 500;
    return Response.json({ error: status === 503 ? "Configure SESSION_SECRET and MONGODB_URI to use accounts." : "Could not verify your session." }, { status });
  }
}
