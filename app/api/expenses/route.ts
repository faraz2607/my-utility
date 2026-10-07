import { ObjectId } from "mongodb";
import { getExpensesCollection } from "@/lib/mongodb";
import { readSession } from "@/lib/auth";

function failure(error: unknown) {
  console.error("Expense API error:", error);
  const message = error instanceof Error ? error.message : "Unexpected server error";
  const unavailable = message.includes("MONGODB_URI") || message.includes("SESSION_SECRET");
  const status = unavailable ? 503 : 500;
  return Response.json({ error: unavailable ? "Configure MONGODB_URI and SESSION_SECRET in .env.local." : "The expense request could not be completed." }, { status });
}

function parseExpense(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const category = typeof data.category === "string" ? data.category : "";
  const amount = Number(data.amount);
  const date = typeof data.date === "string" ? data.date : "";
  const note = typeof data.note === "string" ? data.note.trim().slice(0, 240) : "";
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00.000Z`) : null;
  if (!title || title.length > 80 || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return null;
  if (!["Food", "Transport", "Rent", "Shopping", "Bills", "Health", "Entertainment", "Other"].includes(category)) return null;
  return { title, amount: Math.round(amount * 100) / 100, category, date: parsedDate, note, updatedAt: new Date() };
}

export async function GET(request: Request) {
  try {
    const session = readSession(request);
    if (!session) return Response.json({ error: "Sign in to view expenses." }, { status: 401 });
    const requestUrl = new URL(request.url);
    const from = requestUrl.searchParams.get("from");
    const to = requestUrl.searchParams.get("to");
    const isDate = (value: string | null) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(`${value}T12:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    };
    if ((from && !isDate(from)) || (to && !isDate(to)) || (from && to && from > to)) {
      return Response.json({ error: "Enter a valid date range." }, { status: 400 });
    }
    const expenses = await getExpensesCollection();
    const dateRange: Record<string, Date> = {};
    if (from) dateRange.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) dateRange.$lte = new Date(`${to}T23:59:59.999Z`);
    const filter = from || to ? { userId: session.userId, date: dateRange } : { userId: session.userId };
    const entries = await expenses.find(filter).sort({ date: -1, createdAt: -1 }).limit(1000).toArray();
    return Response.json(entries.map(({ _id, ...expense }) => ({ ...expense, id: _id.toString(), date: expense.date instanceof Date ? expense.date.toISOString().slice(0, 10) : expense.date })));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const session = readSession(request);
    if (!session) return Response.json({ error: "Sign in to add expenses." }, { status: 401 });
    const expense = parseExpense(await request.json());
    if (!expense) return Response.json({ error: "Enter a title, valid amount, category and date." }, { status: 400 });
    const expenses = await getExpensesCollection();
    const createdAt = new Date();
    const result = await expenses.insertOne({ ...expense, userId: session.userId, createdAt });
    return Response.json({ ...expense, createdAt, id: result.insertedId.toString(), date: expense.date.toISOString().slice(0, 10) }, { status: 201 });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const session = readSession(request);
    if (!session) return Response.json({ error: "Sign in to edit expenses." }, { status: 401 });
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid expense id." }, { status: 400 });
    const expense = parseExpense(body);
    if (!expense) return Response.json({ error: "Enter a title, valid amount, category and date." }, { status: 400 });
    const expenses = await getExpensesCollection();
    const result = await expenses.findOneAndUpdate({ _id: new ObjectId(id), userId: session.userId }, { $set: expense }, { returnDocument: "after" });
    if (!result) return Response.json({ error: "Expense not found." }, { status: 404 });
    const { _id, ...saved } = result;
    return Response.json({ ...saved, id: _id.toString(), date: saved.date.toISOString().slice(0, 10) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    const session = readSession(request);
    if (!session) return Response.json({ error: "Sign in to delete expenses." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid expense id." }, { status: 400 });
    const expenses = await getExpensesCollection();
    const result = await expenses.deleteOne({ _id: new ObjectId(id), userId: session.userId });
    if (!result.deletedCount) return Response.json({ error: "Expense not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) { return failure(error); }
}
