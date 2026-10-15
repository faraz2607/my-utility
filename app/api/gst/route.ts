import { ObjectId } from "mongodb";
import { readSession } from "@/lib/auth";
import { getGstCollection } from "@/lib/mongodb";

const kinds = ["customer", "hsn", "business", "invoice"] as const;
type Kind = (typeof kinds)[number];

function failure(error: unknown) {
  console.error("GST API error:", error);
  const message = error instanceof Error ? error.message : "Unexpected server error";
  const unavailable = message.includes("MONGODB_URI") || message.includes("SESSION_SECRET");
  return Response.json({ error: unavailable ? "Configure MONGODB_URI and SESSION_SECRET in .env.local." : "The GST request could not be completed." }, { status: unavailable ? 503 : 500 });
}

function parseBody(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const kind = data.kind as Kind;
  if (!kinds.includes(kind) || !data.data || typeof data.data !== "object") return null;
  const record = data.data as Record<string, unknown>;
  if (kind === "customer" && (!String(record.name || "").trim() || !String(record.address || "").trim() || !String(record.state || "").trim())) return null;
  if (kind === "hsn" && (!String(record.name || "").trim() || !String(record.hsn || "").trim())) return null;
  if (kind === "invoice" && (!String(record.customerId || "") || !Array.isArray(record.items) || !record.items.length || !String(record.date || ""))) return null;
  const clean: Record<string, unknown> = { ...record, updatedAt: new Date() };
  if (kind === "invoice") {
    const items = (record.items as Record<string, unknown>[]).map((item) => {
      const quantity = Math.max(1, Math.min(100000, Number(item.quantity) || 1));
      const price = Math.round(Math.max(0, Number(item.price) || 0) * 1000) / 1000;
      return {
        hsnId: String(item.hsnId || ""), name: String(item.name || "").trim().slice(0, 120),
        description: String(item.description || "").trim().slice(0, 500), hsn: String(item.hsn || "").trim().slice(0, 20),
        quantity, price, taxableAmount: quantity * price,
        totalAfterTax: Math.round((quantity * price * 1.05 + Number.EPSILON) * 100) / 100,
      };
    });
    if (items.some((item) => !item.name || !item.hsn)) return null;
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const interstate = Boolean(record.interstate);
    clean.items = items;
    clean.subtotal = subtotal;
    clean.taxRate = 5;
    const tax = Math.round((subtotal * 0.05 + Number.EPSILON) * 100) / 100;
    clean.cgst = interstate ? 0 : Math.round((subtotal * 0.025 + Number.EPSILON) * 100) / 100;
    clean.sgst = interstate ? 0 : Math.round((tax - Number(clean.cgst)) * 100) / 100;
    clean.igst = interstate ? tax : 0;
    const beforeRoundOff = Math.round((subtotal + tax + Number.EPSILON) * 100) / 100;
    clean.roundOff = Math.round((Math.round(beforeRoundOff) - beforeRoundOff + Number.EPSILON) * 100) / 100;
    clean.total = Math.round(beforeRoundOff + Number(clean.roundOff));
  }
  return { kind, data: clean };
}

export async function GET(request: Request) {
  try {
    const session = readSession(request);
    if (!session) return Response.json({ error: "Sign in to view GST billing." }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const requestedKind = params.get("kind") || "invoice";
    if (!["invoice", "customer", "hsn"].includes(requestedKind)) {
      return Response.json({ error: "Kind must be invoice, customer, or hsn." }, { status: 400 });
    }
    const page = Number(params.get("page") || 1);
    const pageSize = Number(params.get("limit") || 10);
    const includeAllInvoices = params.get("all") === "true" && requestedKind === "invoice";
    const from = params.get("from") || "";
    const to = params.get("to") || "";
    const search = (params.get("search") || "").trim().slice(0, 100);
    if (!Number.isInteger(page) || page < 1) return Response.json({ error: "Page must be a positive integer." }, { status: 400 });
    if (![10, 20, 50, 100].includes(pageSize)) return Response.json({ error: "Limit must be 10, 20, 50, or 100." }, { status: 400 });
    const validDate = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!validDate(from) || !validDate(to)) return Response.json({ error: "Dates must use YYYY-MM-DD format." }, { status: 400 });
    if (from && to && from > to) return Response.json({ error: "The start date must be on or before the end date." }, { status: 400 });

    const collection = await getGstCollection();
    const lookups = await collection
      .find({ userId: session.userId, kind: { $in: ["customer", "hsn", "business"] } })
      .sort({ kind: 1, createdAt: -1 })
      .toArray();
    const listingQuery: Record<string, any> = { userId: session.userId, kind: requestedKind };
    if (requestedKind === "invoice" && (from || to)) {
      listingQuery["data.date"] = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matcher = new RegExp(escaped, "i");
      if (requestedKind === "invoice") {
        const purchaserIds = lookups
          .filter((record) => record.kind === "customer" && matcher.test(String(record.data.name || "")))
          .map((record) => record._id.toString());
        listingQuery.$or = [
          { "data.number": matcher },
          { "data.customerSnapshot.name": matcher },
          ...(purchaserIds.length ? [{ "data.customerId": { $in: purchaserIds } }] : []),
        ];
      } else if (requestedKind === "customer") {
        listingQuery.$or = [{ "data.name": matcher }, { "data.gstin": matcher }];
      } else {
        listingQuery.$or = [{ "data.name": matcher }, { "data.hsn": matcher }];
      }
    }
    const total = await collection.countDocuments(listingQuery);
    const invoiceTotal = await collection.countDocuments({ userId: session.userId, kind: "invoice" });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = includeAllInvoices ? 1 : Math.min(page, totalPages);
    let listingCursor = collection
      .find(listingQuery)
      .sort(requestedKind === "invoice" ? { "data.date": -1, createdAt: -1 } : { createdAt: -1 });
    if (!(includeAllInvoices && requestedKind === "invoice")) {
      listingCursor = listingCursor.skip((currentPage - 1) * pageSize).limit(pageSize);
    }
    const listing = await listingCursor.toArray();
    const records = lookups.map(({ _id, userId, ...entry }) => ({ ...entry, id: _id.toString() }));
    const listingRecords = listing.map(({ _id, userId, ...entry }) => ({ ...entry, id: _id.toString() }));
    return Response.json({
      records,
      listing: listingRecords,
      invoiceTotal,
      pagination: { kind: requestedKind, page: currentPage, limit: pageSize, total, totalPages, from, to, all: includeAllInvoices },
    });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const session = readSession(request);
    if (!session) return Response.json({ error: "Sign in to save GST records." }, { status: 401 });
    const parsed = parseBody(await request.json());
    if (!parsed) return Response.json({ error: "Complete the required fields before saving." }, { status: 400 });
    const createdAt = new Date();
    const collection = await getGstCollection();
    const result = await collection.insertOne({ ...parsed, userId: session.userId, createdAt });
    return Response.json({ ...parsed, id: result.insertedId.toString(), createdAt }, { status: 201 });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const session = readSession(request);
    if (!session) return Response.json({ error: "Sign in to update GST records." }, { status: 401 });
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const parsed = parseBody(body);
    if (!ObjectId.isValid(id) || !parsed) return Response.json({ error: "Invalid record or missing required fields." }, { status: 400 });
    const collection = await getGstCollection();
    const result = await collection.findOneAndUpdate({ _id: new ObjectId(id), userId: session.userId, kind: parsed.kind }, { $set: parsed }, { returnDocument: "after" });
    if (!result) return Response.json({ error: "Record not found." }, { status: 404 });
    const { _id, userId, ...entry } = result;
    return Response.json({ ...entry, id: _id.toString() });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    const session = readSession(request);
    if (!session) return Response.json({ error: "Sign in to delete GST records." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!ObjectId.isValid(id)) return Response.json({ error: "Invalid record id." }, { status: 400 });
    const collection = await getGstCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id), userId: session.userId });
    if (!result.deletedCount) return Response.json({ error: "Record not found." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) { return failure(error); }
}
