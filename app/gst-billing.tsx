"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FilePlus2,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Settings2,
  Trash2,
  Users,
  Hash,
} from "lucide-react";

type RecordEntry = { id: string; kind: "customer" | "hsn" | "business" | "invoice"; data: Record<string, any> };
type Item = {
  hsnId?: string;
  name: string;
  description?: string;
  hsn: string;
  quantity: number;
  price: number;
  taxableAmount?: number;
  totalAfterTax?: number;
};
const GST_STATES = [
  ["01", "Jammu and Kashmir"],
  ["02", "Himachal Pradesh"],
  ["03", "Punjab"],
  ["04", "Chandigarh"],
  ["05", "Uttarakhand"],
  ["06", "Haryana"],
  ["07", "Delhi"],
  ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"],
  ["10", "Bihar"],
  ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"],
  ["14", "Manipur"],
  ["15", "Mizoram"],
  ["16", "Tripura"],
  ["17", "Meghalaya"],
  ["18", "Assam"],
  ["19", "West Bengal"],
  ["20", "Jharkhand"],
  ["21", "Odisha"],
  ["22", "Chhattisgarh"],
  ["23", "Madhya Pradesh"],
  ["24", "Gujarat"],
  ["25", "Daman and Diu (former code)"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"],
  ["27", "Maharashtra"],
  ["28", "Andhra Pradesh (former code)"],
  ["29", "Karnataka"],
  ["30", "Goa"],
  ["31", "Lakshadweep"],
  ["32", "Kerala"],
  ["33", "Tamil Nadu"],
  ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"],
  ["36", "Telangana"],
  ["37", "Andhra Pradesh"],
  ["38", "Ladakh"],
] as const;
const GST_STATES_SORTED = [...GST_STATES].sort((a, b) => a[1].localeCompare(b[1]));
type SelectOption = { value: string; label: string; detail?: string };
function GstSelect({
  options,
  placeholder,
  ariaLabel,
  name,
  value,
  defaultValue = "",
  onChange,
  required = false,
}: {
  options: SelectOption[];
  placeholder: string;
  ariaLabel: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue);
  function updateMenuPosition() {
    const rect = root.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;
    const below = Math.max(0, window.innerHeight - rect.bottom - 8);
    const above = Math.max(0, rect.top - 8);
    const openUp = below < Math.min(260, above) && above > below;
    const width = Math.min(Math.max(rect.width, 190), window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    setMenuStyle({
      position: "fixed",
      left,
      width,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6, maxHeight: Math.max(80, Math.min(260, above)) }
        : { top: rect.bottom + 6, maxHeight: Math.max(80, Math.min(260, below)) }),
    });
  }
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  useEffect(() => {
    if (!open || !root.current) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);
  function choose(option: SelectOption) {
    if (value === undefined) setInternalValue(option.value);
    onChange?.(option.value);
    setOpen(false);
  }
  return (
    <div className={`gst-select ${open ? "is-open" : ""}`} ref={root}>
      {name && <input type="hidden" name={name} value={selectedValue} required={required} />}
      <button
        type="button"
        className={`gst-select-trigger ${selected ? "has-value" : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen((shown) => !shown);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={16} className="gst-select-arrow" />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div ref={menu} className="gst-select-menu" style={menuStyle} role="listbox" aria-label={ariaLabel}>
            {options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === selectedValue}
                key={option.value}
                className={`gst-select-option ${option.value === selectedValue ? "selected" : ""}`}
                onClick={() => choose(option)}
              >
                <span>
                  {option.label}
                  {option.detail && <small>{option.detail}</small>}
                </span>
                {option.value === selectedValue && <Check size={15} />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
const stateCodeFor = (name: string) => {
  const code = GST_STATES.find(([, label]) => label.toLowerCase() === name.toLowerCase())?.[0];
  return code ? String(Number(code)) : "";
};
const cleanStateCode = (value: unknown) => {
  const code = String(value ?? "");
  return code && /^\d+$/.test(code) ? String(Number(code)) : code;
};
const openDatePicker = (event: MouseEvent<HTMLLabelElement>) => {
  const dateInput = event.currentTarget.querySelector("input[type='date']") as (HTMLInputElement & { showPicker?: () => void }) | null;
  if (dateInput?.showPicker) {
    event.preventDefault();
    dateInput.showPicker();
  }
};
const htmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => htmlEntities[character]);
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n || 0);
const formatInvoiceDate = (value: string) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || "");
};
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const businessCode = (name: string) => name.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "INV";
const numberToWords = (amount: number) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const underThousand = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${underThousand(n % 100)}` : ""}`;
  };
  const whole = Math.floor(Math.abs(amount));
  if (!whole) return "Zero Only";
  let remainder = whole;
  const parts: string[] = [];
  for (const [size, label] of [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"], [1, ""]] as const) {
    const count = Math.floor(remainder / size);
    if (count) parts.push(`${underThousand(count)}${label ? ` ${label}` : ""}`);
    remainder %= size;
  }
  return `${parts.join(" ")} Only`;
};
const parseInvoiceDate = (value: string) => {
  const iso = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? value : "";
  }
  const match = String(value || "")
    .trim()
    .match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
    ? `${year}-${month}-${day}`
    : "";
};
const nextInvoiceNumber = (isoDate: string, invoiceRecords: RecordEntry[], businessName: string) => {
  const [year, month] = isoDate.split("-").map(Number);
  const financialYearStart = month >= 4 ? year : year - 1;
  const startDate = `${financialYearStart}-04-01`;
  const endDate = `${financialYearStart + 1}-04-01`;
  const prefix = businessCode(businessName);
  const sequence =
    invoiceRecords.reduce((max, invoice) => {
      const date = String(invoice.data.date || "");
      if (date < startDate || date >= endDate) return max;
      const suffix = String(invoice.data.number || "").match(new RegExp(`^${prefix}(\\d+)$`))?.[1];
      return Math.max(max, Number(suffix) || 0);
    }, 0) + 1;
  return `${prefix}${String(sequence).padStart(3, "0")}`;
};

export default function GstBilling() {
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [listingRecords, setListingRecords] = useState<RecordEntry[]>([]);
  const [section, setSection] = useState("Invoices");
  const [sectionReady, setSectionReady] = useState(false);
  const [editing, setEditing] = useState<RecordEntry | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState(false);
  const [invoiceDateInput, setInvoiceDateInput] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exportingInvoices, setExportingInvoices] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<Item[]>([{ name: "", hsn: "", quantity: 1, price: 0 }]);
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [totalDrafts, setTotalDrafts] = useState<Record<number, string>>({});
  const [invoiceDateFrom, setInvoiceDateFrom] = useState("");
  const [invoiceDateTo, setInvoiceDateTo] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [tableSearch, setTableSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tableTotal, setTableTotal] = useState(0);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const recordsRequestId = useRef(0);
  useEffect(() => {
    const savedSection = window.localStorage.getItem("gst-billing-section");
    if (["Invoices", "Customers", "Products & HSN", "Business profile"].includes(savedSection || "")) {
      setSection(savedSection!);
    }
    setSectionReady(true);
  }, []);
  useEffect(() => {
    if (sectionReady) window.localStorage.setItem("gst-billing-section", section);
  }, [section, sectionReady]);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(tableSearch.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [tableSearch]);
  const refresh = useCallback(async () => {
    const requestId = ++recordsRequestId.current;
    const kind = section === "Customers" ? "customer" : section === "Products & HSN" ? "hsn" : "invoice";
    const params = new URLSearchParams({ kind, page: String(tablePage), limit: String(tablePageSize) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (kind === "invoice" && invoiceDateFrom) params.set("from", invoiceDateFrom);
    if (kind === "invoice" && invoiceDateTo) params.set("to", invoiceDateTo);
    try {
      const response = await fetch(`/api/gst?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (requestId !== recordsRequestId.current) return;
      if (!response.ok) throw new Error(data.error || "Could not load GST records.");
      setRecords(data.records);
      setListingRecords(data.listing);
      setTableTotal(data.pagination.total);
      setTableTotalPages(data.pagination.totalPages);
      setInvoiceCount(data.invoiceTotal);
      setTablePage(data.pagination.page);
    } catch (error) {
      if (requestId === recordsRequestId.current) throw error;
    }
  }, [debouncedSearch, invoiceDateFrom, invoiceDateTo, section, tablePage, tablePageSize]);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [refresh]);

  const customers = records.filter((r) => r.kind === "customer");
  const hsnEntries = records.filter((r) => r.kind === "hsn");
  const business = records.find((r) => r.kind === "business");
  const invoices = listingRecords
    .filter((r) => r.kind === "invoice")
    .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)));
  const subtotal = useMemo(() => items.reduce((n, item) => n + item.quantity * item.price, 0), [items]);
  const taxAmount = Math.round((subtotal * 0.05 + Number.EPSILON) * 100) / 100;
  const amountBeforeRoundOff = Math.round((subtotal + taxAmount + Number.EPSILON) * 100) / 100;
  const roundOff = Math.round((Math.round(amountBeforeRoundOff) - amountBeforeRoundOff + Number.EPSILON) * 100) / 100;
  const payable = Math.round(amountBeforeRoundOff + roundOff);
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const businessStateCode = cleanStateCode(business?.data.stateCode || stateCodeFor(business?.data.state || ""));
  const customerStateCode = cleanStateCode(
    selectedCustomer?.data.stateCode || stateCodeFor(selectedCustomer?.data.state || ""),
  );
  const interstate = Boolean(businessStateCode && customerStateCode && businessStateCode !== customerStateCode);
  const editRecord = (record: RecordEntry | null, kind?: string) => {
    setEditing(record || { id: "", kind: (kind || "customer") as RecordEntry["kind"], data: {} });
    setViewingInvoice(false);
    if (record?.kind === "invoice") {
      setInvoiceDateInput(formatInvoiceDate(String(record.data.date || "")));
      setInvoiceNumber(String(record.data.number || ""));
      setCustomerId(String(record.data.customerId || ""));
      setItems(
        (record.data.items || []).map((item: Item) => ({
          hsnId:
            item.hsnId ||
            hsnEntries.find((entry) => entry.data.name === item.name && entry.data.hsn === item.hsn)?.id ||
            hsnEntries.find((entry) => entry.data.hsn === item.hsn)?.id ||
            "",
          name: item.description || item.name,
          description: "",
          hsn: item.hsn,
          quantity: item.quantity,
          price: item.price,
        })),
      );
      setTotalDrafts({});
      setRateDrafts({});
    } else if (!record && kind === "invoice") {
      const today = localToday();
      setInvoiceDateInput(formatInvoiceDate(today));
      setInvoiceNumber(nextInvoiceNumber(today, invoices, business?.data.name || ""));
      setCustomerId("");
      setItems([{ name: "", hsn: "", quantity: 1, price: 0 }]);
      setTotalDrafts({});
      setRateDrafts({});
    }
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const kind = editing!.kind;
    if ((kind === "business" || kind === "customer") && !String(form.get("state") || "").includes("|")) {
      setError("Select a state.");
      setBusy(false);
      return;
    }
    if (kind === "invoice" && (!customerId || items.some((item) => !item.name.trim() || !item.hsn.trim()))) {
      setError("Choose a purchaser and complete each invoice item.");
      setBusy(false);
      return;
    }
    const invoiceDate = kind === "invoice" ? parseInvoiceDate(String(form.get("date") || "")) : "";
    if (kind === "invoice" && !invoiceDate) {
      setError("Choose a valid invoice date.");
      setBusy(false);
      return;
    }
    const [rawStateCode, state] = String(form.get("state") || "|").split("|");
    const stateCode = cleanStateCode(rawStateCode);
    const savedItems = items.map((item, index) =>
      rateDrafts[index] !== undefined
        ? { ...item, price: Math.max(0, Number(rateDrafts[index]) || 0) }
        : totalDrafts[index] !== undefined
          ? {
              ...item,
              price: Math.round(((Number(totalDrafts[index]) || 0) / (Math.max(1, item.quantity) * 1.05)) * 1000) / 1000,
            }
          : item,
    );
    const data: Record<string, any> =
      kind === "business"
        ? {
            name: form.get("name"),
            gstin: form.get("gstin"),
            address: form.get("address"),
            state,
            stateCode,
            phone: form.get("phone"),
            email: form.get("email"),
            bankName: form.get("bankName"),
            accountNumber: form.get("accountNumber"),
            ifsc: form.get("ifsc"),
            branch: form.get("branch"),
            description: String(form.get("description") || "").slice(0, 150),
          }
        : kind === "customer"
          ? {
              name: form.get("name"),
              gstin: form.get("gstin"),
              address: form.get("address"),
              state,
              stateCode,
            }
          : kind === "hsn"
            ? { name: form.get("name"), hsn: form.get("hsn") }
            : {
                customerId,
                customerSnapshot: customers.find((c) => c.id === customerId)?.data || null,
                businessSnapshot: business?.data || null,
                interstate,
                transport: String(form.get("transport") || "").trim(),
                items: savedItems,
                date: invoiceDate,
                number: String(form.get("number")),
              };
    try {
      const response = await fetch("/api/gst", {
        method: editing!.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editing!.id ? { id: editing!.id } : {}), kind, data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save record.");
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save record.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(record: RecordEntry) {
    if (!window.confirm(`Delete ${record.kind} “${record.data.name || record.data.number || "record"}”?`)) return;
    try {
      const response = await fetch(`/api/gst?id=${record.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete record.");
    }
  }
  function downloadInvoicePdf() {
    const invoiceMarkup = document.querySelector(".invoice-paper")?.outerHTML;
    if (!invoiceMarkup) return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setError("Allow pop-ups to open the clean invoice print view.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>GST invoice</title><style>
      @page{size:A4 portrait;margin:8mm}
      *{box-sizing:border-box}
      html,body{width:100%;margin:0;padding:0;background:#fff;color:#25242b;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .invoice-paper{width:100%;min-height:0;margin:0;padding:0;background:#fff;box-shadow:none}
      .invoice-document-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px}
      .invoice-document-heading h1{margin:0;font-size:19px;font-weight:700;letter-spacing:.4px}
      .invoice-document-heading>span{color:#6655c7;font-size:10px;font-weight:700;letter-spacing:1.2px}
      .invoice-paper-top{padding-bottom:14px;border-bottom:2px solid #35333a}
      .invoice-business-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:3px}
      .invoice-business-copy{display:grid;gap:3px;min-width:0}
      .invoice-business-copy>strong{color:#2d2b34;font-size:16px;font-weight:700;overflow-wrap:anywhere}
      .invoice-business-copy .invoice-business-description{margin:0}
      .invoice-business-heading>.invoice-gstin{flex:0 0 auto}
      .invoice-paper-top p{margin:7px 0 0;color:#55525d;font-size:11px;line-height:1.5}
      .invoice-paper-meta{display:flex;justify-content:space-between;gap:20px;padding:15px 0}
      .invoice-paper-meta>div{display:grid;align-content:start;gap:4px;max-width:48%}
      .invoice-paper-meta small{color:#6655c7;font-size:10px;font-weight:700;letter-spacing:.8px}
      .invoice-paper-meta strong{font-size:12px;font-weight:700}
      .invoice-paper-meta span{color:#55525d;font-size:10px;line-height:1.4;overflow-wrap:anywhere}
      .invoice-paper-meta b,.invoice-paper-top b{font-weight:700;color:#3d3b44}
      .invoice-paper-table{display:table;width:100%;table-layout:fixed;border-collapse:collapse}
      .invoice-paper-table thead{display:table-header-group}
      .invoice-paper-table tr{break-inside:avoid;page-break-inside:avoid}
      .invoice-paper-table th,.invoice-paper-table td{display:table-cell;min-width:0;padding:6px 3px;border-bottom:1px solid #e8e6ec;font-size:10px;line-height:1.35;white-space:normal;overflow-wrap:anywhere;vertical-align:top}
      .invoice-paper-table th{background:#f5f4f7;color:#55525d;font-weight:700;text-align:left}
      .invoice-paper-table td{color:#33313a}
      .invoice-col-item{width:27%}.invoice-col-hsn{width:10%}.invoice-col-quantity{width:7%}.invoice-col-rate{width:14%}.invoice-col-taxable{width:21%}.invoice-col-total{width:21%}
      .invoice-paper-table th:nth-child(n+3),.invoice-paper-table td:nth-child(n+3){text-align:right}
      .invoice-paper-total{display:grid;gap:7px;width:270px;max-width:100%;margin:14px 0 0 auto}
      .invoice-total-row{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}
      .invoice-amount-words{display:grid;gap:7px;max-width:52%;align-self:flex-end;margin-top:0;padding:10px 12px;border:1px solid #e9e7ed;border-radius:5px;color:#33313a;font-size:11px}
      .invoice-amount-words strong{font-size:12px;font-weight:700}.invoice-amount-words span{line-height:1.5}
      .invoice-bottom-row{display:flex;justify-content:space-between;gap:18px;margin-top:15px}
      .invoice-signature{display:flex;width:270px;max-width:48%;min-height:100px;flex-direction:column;align-items:flex-end;justify-content:space-between;padding:10px 0;color:#55525d;font-size:10px;text-align:right}
      .invoice-signature>div{flex:1;min-height:45px}.invoice-signature strong{width:100%;padding-top:7px;border-top:1px solid #aaa7b1;color:#33313a}
      .invoice-gstin{display:inline-block;padding:4px 7px;border:1px solid #ded9f7;border-radius:4px;background:#f4f1ff;color:#45369d!important;font-weight:700}
      .invoice-business-description{margin-top:3px;color:#67646e;font-size:11px;font-style:italic}
      .invoice-paper-total>div{display:flex;justify-content:space-between;gap:14px;color:#55525d;font-size:11px}
      .invoice-paper-total strong{color:#33313a;font-weight:700}
      .invoice-paper-total .invoice-grand-total{padding-top:8px;border-top:1px solid #d9d7dd;color:#292730;font-size:13px;font-weight:700}
      .invoice-grand-total strong{font-size:12px}
      .invoice-bank-details{width:330px;max-width:100%;margin:15px 0 0;padding:10px 12px;border:1px solid #e9e7ed;border-radius:5px;break-inside:avoid}
      .invoice-bank-details>strong{display:block;margin-bottom:6px;font-size:11px}
      .invoice-bank-details>strong{font-weight:700}
      .invoice-customer-heading{display:flex;align-items:center;justify-content:flex-start;gap:20px;min-width:0}
      .invoice-customer-heading>strong{min-width:0;overflow-wrap:anywhere}
      .invoice-customer-heading>.invoice-gstin{flex:0 0 auto}
      .invoice-bank-details>div{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px}
      .invoice-bank-details span{font-size:10px;color:#55525d;overflow-wrap:anywhere}
      .invoice-paper-foot{margin-top:24px;padding-top:8px;border-top:1px solid #eeecf0;color:#92909a;font-size:10px;text-align:center}
      @media screen{body{padding:20px;background:#f4f3f6}.invoice-paper{max-width:794px;margin:0 auto;padding:32px;background:white;box-shadow:0 4px 24px #25242b18}}
    </style></head><body>${invoiceMarkup}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }
  async function downloadInvoiceListPdf() {
    const printWindow = window.open("", "_blank", "width=1400,height=900");
    if (!printWindow) {
      setError("Allow pop-ups to open the invoice list PDF.");
      return;
    }
    setExportingInvoices(true);
    setError("");
    try {
      const params = new URLSearchParams({ kind: "invoice", all: "true" });
      if (invoiceDateFrom) params.set("from", invoiceDateFrom);
      if (invoiceDateTo) params.set("to", invoiceDateTo);
      const response = await fetch(`/api/gst?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not prepare the invoice list.");
      const allRecords = result.records as RecordEntry[];
      const list = result.listing as RecordEntry[];
      const purchasers = allRecords.filter((record) => record.kind === "customer");
      const rows = list.map((invoice, index) => {
        const customer = invoice.data.customerSnapshot || purchasers.find((record) => record.id === invoice.data.customerId)?.data || {};
        const customerState = customer.state
          ? `${customer.state} (${cleanStateCode(customer.stateCode || stateCodeFor(customer.state))})`
          : "—";
        const items = Array.isArray(invoice.data.items) ? invoice.data.items : [];
        const productList = items.length
          ? items.map((item: Item) => `<div class="product-entry"><strong>${escapeHtml(item.name || "—")}</strong><span>Qty: ${escapeHtml(item.quantity ?? "—")}</span></div>`).join("")
          : "—";
        const taxable = invoice.data.subtotal ?? (items.length
          ? items.reduce((sum: number, item: Item) => sum + Number(item.taxableAmount ?? item.quantity * item.price), 0)
          : undefined);
        const interstate = Boolean(invoice.data.interstate);
        const optionalMoney = (value: unknown) => value === undefined || value === null || value === "" ? "—" : money(Number(value));
        return `<tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(customer.name || "—")}</strong><div>${escapeHtml(customer.address || "—")}<br>${escapeHtml(customerState)}</div></td>
          <td>${escapeHtml(customer.gstin || "—")}</td>
          <td>${escapeHtml(invoice.data.number || "—")}</td>
          <td>${escapeHtml(invoice.data.date ? formatInvoiceDate(String(invoice.data.date)) : "—")}</td>
          <td>${productList}</td>
          <td class="amount">${escapeHtml(optionalMoney(taxable))}</td>
          <td class="amount">${interstate ? "—" : escapeHtml(optionalMoney(invoice.data.cgst))}</td>
          <td class="amount">${interstate ? "—" : escapeHtml(optionalMoney(invoice.data.sgst))}</td>
          <td class="amount">${interstate ? escapeHtml(optionalMoney(invoice.data.igst)) : "—"}</td>
          <td class="amount">${escapeHtml(optionalMoney(invoice.data.roundOff))}</td>
          <td class="amount total">${escapeHtml(optionalMoney(invoice.data.total))}</td>
        </tr>`;
      }).join("");
      const period = invoiceDateFrom || invoiceDateTo
        ? `${invoiceDateFrom ? escapeHtml(formatInvoiceDate(invoiceDateFrom)) : "Any"} to ${invoiceDateTo ? escapeHtml(formatInvoiceDate(invoiceDateTo)) : "Any"}`
        : "All dates";
      printWindow.document.open();
      const businessName = escapeHtml(String(business?.data.name || "Business"));
      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice list</title><style>
        @page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{margin:0;color:#26242d;font:8px Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #35333a}h1{margin:0 0 4px;font-size:18px}header p{margin:0;color:#706d78;font-size:11px}
        table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{padding:5px 4px;border:1px solid #dedce3;text-align:left;vertical-align:top;overflow-wrap:anywhere;line-height:1.3}th{background:#f2f1f5;color:#514e59;font-weight:700}td{color:#35333c;font-size:12px}td:first-child{text-align:center}.amount{text-align:right;white-space:nowrap}.total{font-weight:700}.product-entry{display:flex;justify-content:space-between;gap:5px;padding:2px 0;border-bottom:1px dotted #e5e3e9}.product-entry:last-child{border:0}.product-entry span{white-space:nowrap;color:#66636e}td div:not(.product-entry){margin-top:3px;color:#66636e}
        .empty{text-align:center;padding:18px;color:#77747f}@media screen{body{padding:24px;background:#f4f3f6}main{max-width:1400px;margin:auto;padding:20px;background:#fff;box-shadow:0 4px 24px #25242b18}}
      </style></head><body><main><header><div><h1>Invoice Register <span>for ${businessName}</span></h1><p>Date range: ${period}</p></div><strong>${list.length} invoice${list.length === 1 ? "" : "s"}</strong></header><table><thead><tr><th style="width:3%">Sr No.</th><th style="width:13%">Name &amp; Address</th><th style="width:9%">GSTIN</th><th style="width:9%">Invoice No.</th><th style="width:7%">Date</th><th style="width:15%">Product / Quantity</th><th style="width:8%">Taxable amount</th><th style="width:6%">CGST</th><th style="width:6%">SGST</th><th style="width:6%">IGST</th><th style="width:6%">Round off</th><th style="width:8%">Total amount</th></tr></thead><tbody>${rows || `<tr><td class="empty" colspan="12">No invoices found for the selected dates.</td></tr>`}</tbody></table></main></body></html>`);
      printWindow.document.close();
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 250);
    } catch (error) {
      printWindow.close();
      setError(error instanceof Error ? error.message : "Could not prepare the invoice list.");
    } finally {
      setExportingInvoices(false);
    }
  }
  const nav = [
    { name: "Invoices", icon: ReceiptText },
    { name: "Customers", icon: Users },
    { name: "Products & HSN", icon: Hash },
    { name: "Business profile", icon: Settings2 },
  ];
  const listingVisible = section === "Invoices"
    ? listingRecords.filter((record) => record.kind === "invoice")
    : listingRecords.filter((record) => record.kind === (section === "Customers" ? "customer" : "hsn"));
  const filteredInvoices = invoices.filter((invoice) => {
    const date = String(invoice.data.date || "");
    return (!invoiceDateFrom || date >= invoiceDateFrom) && (!invoiceDateTo || date <= invoiceDateTo);
  });
  const pageCount = tableTotalPages;
  const currentPage = tablePage;
  const pageVisible = section === "Invoices" ? filteredInvoices : listingVisible;
  const rangeStart = tableTotal ? (currentPage - 1) * tablePageSize + 1 : 0;
  const rangeEnd = Math.min(currentPage * tablePageSize, tableTotal);
  const add = () =>
    editRecord(
      null,
      section === "Customers"
        ? "customer"
        : section === "Products & HSN"
          ? "hsn"
          : section === "Business profile"
            ? "business"
            : "invoice",
    );
  const printing = viewingInvoice && editing?.kind === "invoice" && editing.id;
  const printData: Record<string, any> = printing ? editing!.data : {};
  const printCustomer = printData.customerSnapshot || customers.find((c) => c.id === printData.customerId)?.data;
  const printBusiness = printData.businessSnapshot || business?.data;

  return (
    <div className="gst-wrap">
      <div className="gst-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> GST WORKSPACE
          </div>
          <h1>GST billing</h1>
          <p>Manage your billing details and keep every invoice close at hand.</p>
        </div>
        <button className="primary-button" onClick={add}>
          <Plus size={15} />
          {section === "Invoices"
            ? "Create invoice"
            : section === "Business profile"
              ? business
                ? "Edit business details"
                : "Set up business"
              : `Add ${section === "Products & HSN" ? "product" : section.slice(0, -1).toLowerCase()}`}
        </button>
      </div>
      <div className="gst-tabs">
        {nav.map(({ name, icon: Icon }) => (
          <button
            key={name}
            onClick={() => {
              setSection(name);
              setTablePage(1);
              setTableSearch("");
              setDebouncedSearch("");
              setEditing(null);
            }}
            className={section === name ? "active" : ""}
          >
            <Icon size={15} />
            {name}
            {name === "Invoices" && <span>{invoiceCount}</span>}
          </button>
        ))}
      </div>
      {error && <div className="gst-error">{error}</div>}
      {section === "Invoices" && !business && (
        <div className="gst-setup-callout">
          <div>
            <strong>Set up your business details</strong>
            <span>Add your GSTIN, address and state before creating your first invoice.</span>
          </div>
          <button
            onClick={() => {
              setSection("Business profile");
              editRecord(null, "business");
            }}
          >
            Set up profile <Settings2 size={14} />
          </button>
        </div>
      )}
      {section === "Business profile" ? (
        <div className="gst-profile-card">
          <div className="gst-card-title">
            <div>
              <small className="gst-profile-label">BUSINESS NAME</small>
              <strong>{business?.data.name || "Business profile"}</strong>
              {business?.data.description && <span className="gst-business-description">{business.data.description}</span>}
              <span>
                {business?.data.gstin ? (
                  <>GSTIN · {business.data.gstin}</>
                ) : (
                  "Your GST details appear on every invoice."
                )}
              </span>
            </div>
            <button className="gst-icon-btn" onClick={() => editRecord(business || null, "business")}>
              <Pencil size={15} />
            </button>
          </div>
          {business && (
            <div className="gst-profile-info">
              <span>
                <b>Address</b>
                <span>{business.data.address}</span>
              </span>
              <span>
                <b>State</b>
                <span>
                  {business.data.state} ({cleanStateCode(business.data.stateCode || stateCodeFor(business.data.state))})
                </span>
              </span>
              {business.data.phone && (
                <span>
                  <b>Phone</b>
                  <span>{business.data.phone}</span>
                </span>
              )}
              {business.data.email && (
                <span>
                  <b>Email</b>
                  <span>{business.data.email}</span>
                </span>
              )}
              {business.data.bankName && (
                <span>
                  <b>Bank</b>
                  <span>{business.data.bankName}</span>
                </span>
              )}
              {business.data.accountNumber && (
                <span>
                  <b>Account number</b>
                  <span>{business.data.accountNumber}</span>
                </span>
              )}
              {business.data.ifsc && (
                <span>
                  <b>IFSC code</b>
                  <span>{business.data.ifsc}</span>
                </span>
              )}
              {business.data.branch && (
                <span>
                  <b>Branch</b>
                  <span>{business.data.branch}</span>
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="gst-list-card">
          <div className="gst-list-head">
            <div>
              <strong>{section}</strong>
            </div>
            {section === "Invoices" ? (
              <button className="gst-subtle-button" disabled={exportingInvoices} onClick={() => void downloadInvoiceListPdf()}>
                <Download size={14} /> {exportingInvoices ? "Preparing PDF…" : "Download invoice list (PDF)"}
              </button>
            ) : (
              <button className="gst-subtle-button" onClick={add}>
                <Plus size={14} />{" "}
                {section === "Products & HSN" ? "Add product" : `Add ${section.slice(0, -1).toLowerCase()}`}
              </button>
            )}
          </div>
          <div className="gst-list-controls">
            <div className="gst-search-row">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                aria-label={`Search ${section.toLowerCase()}`}
                placeholder={section === "Invoices" ? "Invoice number or purchaser" : section === "Customers" ? "Customer name or GSTIN" : "Product name or HSN code"}
                value={tableSearch}
                onChange={(event) => { setTableSearch(event.target.value); setTablePage(1); }}
              />
            </div>
            {section === "Invoices" && (
              <>
              <strong>Custom date range</strong>
              <label className="gst-date-field" onClick={openDatePicker}>From <input aria-label="Invoices from date" type="date" value={invoiceDateFrom} onChange={(event) => { setInvoiceDateFrom(event.target.value); setTablePage(1); }} /></label>
              <label className="gst-date-field" onClick={openDatePicker}>To <input aria-label="Invoices to date" type="date" value={invoiceDateTo} onChange={(event) => { setInvoiceDateTo(event.target.value); setTablePage(1); }} /></label>
              <button
                type="button"
                className="gst-subtle-button"
                disabled={!invoiceDateFrom && !invoiceDateTo}
                onClick={() => { setInvoiceDateFrom(""); setInvoiceDateTo(""); setTablePage(1); }}
              >Clear dates</button>
              </>
            )}
          </div>
          {tableTotal === 0 ? (
            <div className="gst-empty">
              <span className="gst-empty-icon">
                <FilePlus2 size={21} />
              </span>
              <strong>{tableSearch.trim() ? `No ${section.toLowerCase()} match your search` : section === "Invoices" && (invoiceDateFrom || invoiceDateTo) ? "No invoices in this date range" : `No ${section.toLowerCase()} yet`}</strong>
              <span>
                {tableSearch.trim()
                  ? "Try a different search term."
                  : section === "Invoices" && (invoiceDateFrom || invoiceDateTo)
                  ? "Adjust or clear the selected dates to see more invoices."
                  : section === "Invoices"
                    ? "Create your first GST invoice to get started."
                  : `Add a ${section === "Products & HSN" ? "product title and HSN code" : section.slice(0, -1).toLowerCase()} to make invoicing quicker.`}
              </span>
              <button className="gst-subtle-button" onClick={add}>
                <Plus size={14} />{" "}
                {section === "Invoices"
                  ? "Create invoice"
                  : `Add ${section === "Products & HSN" ? "product" : section.slice(0, -1).toLowerCase()}`}
              </button>
            </div>
          ) : (
            <>
            <div className="gst-table-scroll">
              <table className="gst-table">
                <thead>
                  <tr>
                    {section === "Invoices" ? (
                      <>
                        <th>Invoice</th>
                        <th>Purchaser</th>
                        <th>Date</th>
                        <th>Tax</th>
                        <th>Total</th>
                      </>
                    ) : section === "Customers" ? (
                      <>
                        <th>Name</th>
                        <th>GSTIN</th>
                        <th>State</th>
                        <th>Address</th>
                      </>
                    ) : (
                      <>
                        <th>Product title</th>
                        <th>HSN code</th>
                      </>
                    )}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageVisible.map((r) => {
                    const customer = customers.find((c) => c.id === r.data.customerId)?.data;
                    return (
                      <tr key={r.id}>
                        {section === "Invoices" ? (
                          <>
                            <td>
                              <strong>{r.data.number || "GST invoice"}</strong>
                            </td>
                            <td>{r.data.customerSnapshot?.name || customer?.name || "Customer removed"}</td>
                            <td>{formatInvoiceDate(String(r.data.date || ""))}</td>
                            <td>
                              {money(
                                r.data.interstate ? r.data.igst : Number(r.data.cgst || 0) + Number(r.data.sgst || 0),
                              )}
                            </td>
                            <td>
                              <strong>{money(r.data.total)}</strong>
                            </td>
                          </>
                        ) : section === "Customers" ? (
                          <>
                            <td>
                              <strong>{r.data.name}</strong>
                            </td>
                            <td>{r.data.gstin || "—"}</td>
                            <td>
                              {r.data.state} ({cleanStateCode(r.data.stateCode || stateCodeFor(r.data.state))})
                            </td>
                            <td className="gst-address-cell">{r.data.address}</td>
                          </>
                        ) : (
                          <>
                            <td>
                              <strong>{r.data.name}</strong>
                            </td>
                            <td>{r.data.hsn}</td>
                          </>
                        )}
                        <td>
                          <div className="gst-row-actions">
                            <button
                              title={section === "Invoices" ? "View / download PDF" : "Edit"}
                              onClick={() => {
                                editRecord(r);
                                setViewingInvoice(true);
                              }}
                            >
                              {section === "Invoices" ? <Download size={14} /> : <Pencil size={14} />}
                            </button>
                            {section === "Invoices" && (
                              <button title="Edit invoice" onClick={() => editRecord(r)}>
                                <Pencil size={14} />
                              </button>
                            )}
                            <button title="Delete" onClick={() => void remove(r)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
              <div className="gst-pagination">
                <span>Showing {rangeStart}–{rangeEnd} of {tableTotal}</span>
                <label>Rows per page
                  <select value={tablePageSize} onChange={(event) => { setTablePageSize(Number(event.target.value)); setTablePage(1); }}>
                    {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                <div className="gst-pagination-controls">
                  <span>Page {currentPage} of {pageCount}</span>
                  <button type="button" aria-label="Previous table page" disabled={currentPage <= 1} onClick={() => setTablePage(currentPage - 1)}><ChevronLeft size={16} /></button>
                  <button type="button" aria-label="Next table page" disabled={currentPage >= pageCount} onClick={() => setTablePage(currentPage + 1)}><ChevronRight size={16} /></button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {editing && (
        <div
          className={`gst-modal-backdrop ${printing ? "gst-preview-backdrop" : ""}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className={`gst-modal ${printing ? "gst-print-modal" : ""}`}>
            {printing ? (
              <>
                <div className="gst-print-toolbar">
                  <button className="gst-subtle-button" onClick={() => setEditing(null)}>
                    Close
                  </button>
                  <button className="primary-button" onClick={downloadInvoicePdf}>
                    <Printer size={15} /> Download PDF
                  </button>
                </div>
                <div className="invoice-paper-scroll">
                  <article className="invoice-paper">
                  <div className="invoice-paper-top">
                    <div className="invoice-document-heading">
                      <h1>TAX INVOICE</h1>
                      <span>GST BILLING</span>
                    </div>
                    <div className="invoice-business-heading">
                      <div className="invoice-business-copy">
                        <strong>{printBusiness?.name || "Your business"}</strong>
                        {printBusiness?.description && <div className="invoice-business-description">{printBusiness.description}</div>}
                      </div>
                      {printBusiness?.gstin && <span className="invoice-gstin"><b>GSTIN:</b> {printBusiness.gstin}</span>}
                    </div>
                    <p>
                      <b>Address:</b> {printBusiness?.address}
                      <br />
                      <b>State:</b> {printBusiness?.state} (
                      {cleanStateCode(printBusiness?.stateCode || stateCodeFor(printBusiness?.state || ""))})
                      {printBusiness?.phone && (
                        <>
                          <br />
                          <b>Phone:</b> {printBusiness.phone}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="invoice-paper-meta">
                    <div>
                      <small>BILL TO</small>
                      <div className="invoice-customer-heading">
                        <strong>{printCustomer?.name || "Purchaser"}</strong>
                        {printCustomer?.gstin && <span className="invoice-gstin"><b>GSTIN:</b> {printCustomer.gstin}</span>}
                      </div>
                      <span>
                        <b>Address:</b> {printCustomer?.address}
                      </span>
                      <span><b>State:</b> {printCustomer?.state} ({cleanStateCode(printCustomer?.stateCode || stateCodeFor(printCustomer?.state || ""))})</span>
                    </div>
                    <div>
                      <small>INVOICE DETAILS</small>
                      <span>
                        <b>Inv. No:</b> <strong>{printData.number}</strong>
                      </span>
                      <span>
                        <b>Invoice date:</b> {formatInvoiceDate(String(printData.date || ""))}
                      </span>
                      {printData.transport && <span><b>Transport:</b> {printData.transport}</span>}
                    </div>
                  </div>
                  <table className="invoice-paper-table">
                    <colgroup>
                      <col className="invoice-col-item" />
                      <col className="invoice-col-hsn" />
                      <col className="invoice-col-quantity" />
                      <col className="invoice-col-rate" />
                      <col className="invoice-col-taxable" />
                      <col className="invoice-col-total" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Item / Description</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Taxable amount</th>
                        <th>Total incl. tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printData.items.map((item: Item, i: number) => (
                        <tr key={i}>
                          <td>
                            <strong>{item.name}</strong>
                          </td>
                          <td>{item.hsn}</td>
                          <td>{item.quantity}</td>
                          <td>{money(item.price)}</td>
                          <td>{money(item.taxableAmount ?? item.quantity * item.price)}</td>
                          <td>{money(item.totalAfterTax ?? item.quantity * item.price * 1.05)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="invoice-total-row">
                  <div className="invoice-amount-words"><strong>Rupee in words:</strong><span>{numberToWords(Number(printData.total || 0))}</span></div>
                  <div className="invoice-paper-total">
                    <div>
                      <span>Taxable value</span>
                      <strong>{money(printData.subtotal)}</strong>
                    </div>
                    {printData.interstate ? (
                      <div>
                        <span>IGST · 5%</span>
                        <strong>{money(printData.igst)}</strong>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span>CGST · 2.5%</span>
                          <strong>{money(printData.cgst)}</strong>
                        </div>
                        <div>
                          <span>SGST · 2.5%</span>
                          <strong>{money(printData.sgst)}</strong>
                        </div>
                      </>
                    )}
                    <div>
                      <span>Round off</span>
                      <strong>{money(printData.roundOff || 0)}</strong>
                    </div>
                    <div className="invoice-grand-total">
                      <span>Total payable</span>
                      <strong>{money(printData.total)}</strong>
                    </div>
                  </div>
                  </div>
                  <div className="invoice-bottom-row">
                  {(printBusiness?.bankName ||
                    printBusiness?.accountNumber ||
                    printBusiness?.ifsc ||
                    printBusiness?.branch) && (
                    <section className="invoice-bank-details">
                      <strong>Bank details</strong>
                      <div>
                        {printBusiness.accountNumber && <span><b>Acc. No:</b> {printBusiness.accountNumber}</span>}
                        {printBusiness.bankName && <span><b>Bank:</b> {printBusiness.bankName}</span>}
                        {printBusiness.branch && <span><b>Branch:</b> {printBusiness.branch}</span>}
                        {printBusiness.ifsc && <span><b>IFSC:</b> {printBusiness.ifsc}</span>}
                      </div>
                    </section>
                  )}
                  <section className="invoice-signature"><span>For {printBusiness?.name || ""}</span><div></div><strong>Authorized Signatory</strong></section>
                  </div>
                  <div className="invoice-paper-foot">This is a computer-generated invoice.</div>
                  </article>
                </div>
              </>
            ) : (
              <>
                <div className="gst-modal-head">
                  <div>
                    <div className="eyebrow">
                      <span className="eyebrow-dot" /> {editing.id ? "UPDATE DETAILS" : "NEW ENTRY"}
                    </div>
                    <h2>
                      {editing.kind === "business"
                        ? "Business profile"
                        : editing.kind === "customer"
                          ? `${editing.id ? "Edit" : "Add"} purchaser`
                          : editing.kind === "hsn"
                            ? `${editing.id ? "Edit" : "Add"} product`
                            : `${editing.id ? "Edit" : "Create"} invoice`}
                    </h2>
                  </div>
                  <button className="gst-icon-btn" onClick={() => setEditing(null)}>
                    ×
                  </button>
                </div>
                <form onSubmit={save} className="gst-form">
                  {(editing.kind === "business" || editing.kind === "customer") && (
                    <>
                      <label>
                        Business / purchaser name
                        <input name="name" required defaultValue={editing.data.name} />
                      </label>
                      {editing.kind === "business" && <label className="gst-full">
                        Business description <small>Optional, up to 150 characters</small>
                        <textarea name="description" rows={2} maxLength={150} defaultValue={editing.data.description} placeholder="A short introduction to your business" />
                      </label>}
                      <label>
                        GSTIN
                        <input
                          name="gstin"
                          defaultValue={editing.data.gstin}
                          placeholder="Optional for unregistered purchaser"
                        />
                      </label>
                      <label className="gst-full">
                        Address
                        <textarea name="address" required rows={2} defaultValue={editing.data.address} />
                      </label>
                      <label>
                        State
                        <GstSelect
                          ariaLabel="State"
                          name="state"
                          required
                          defaultValue={
                            editing.data.state
                              ? `${cleanStateCode(editing.data.stateCode || stateCodeFor(editing.data.state))}|${editing.data.state}`
                              : ""
                          }
                          placeholder="Select state"
                          options={GST_STATES_SORTED.map(([code, name]) => ({
                            value: `${String(Number(code))}|${name}`,
                            label: `${name} (${String(Number(code))})`,
                          }))}
                        />
                      </label>
                      {editing.kind === "business" && (
                        <>
                          <label>
                            Phone
                            <input name="phone" defaultValue={editing.data.phone} />
                          </label>
                          <label>
                            Email
                            <input name="email" type="email" defaultValue={editing.data.email} />
                          </label>
                          <div className="gst-full gst-bank-heading">
                            <strong>Bank details</strong>
                            <span>These details appear on your invoice PDF.</span>
                          </div>
                          <label>
                            Bank name
                            <input name="bankName" defaultValue={editing.data.bankName} placeholder="Bank name" />
                          </label>
                          <label>
                            Account number
                            <input
                              name="accountNumber"
                              inputMode="numeric"
                              defaultValue={editing.data.accountNumber}
                              placeholder="Account number"
                            />
                          </label>
                          <label>
                            IFSC code
                            <input name="ifsc" defaultValue={editing.data.ifsc} placeholder="e.g. HDFC0001234" />
                          </label>
                          <label className="gst-full">
                            Branch
                            <input
                              name="branch"
                              defaultValue={editing.data.branch}
                              placeholder="Branch name (optional)"
                            />
                          </label>
                        </>
                      )}
                    </>
                  )}
                  {editing.kind === "hsn" && (
                    <>
                      <label>
                        Product name
                        <input name="name" required defaultValue={editing.data.name} />
                      </label>
                      <label>
                        HSN code
                        <input name="hsn" required defaultValue={editing.data.hsn} />
                      </label>
                    </>
                  )}
                  {editing.kind === "invoice" && (
                    <>
                      <label>
                        Invoice number
                        <input
                          name="number"
                          required
                          value={invoiceNumber}
                          onChange={(event) => setInvoiceNumber(event.target.value)}
                        />
                      </label>
                      <label
                        className="gst-date-field"
                        onClick={(event) => {
                          const dateInput = event.currentTarget.querySelector("input[type='date']") as (HTMLInputElement & { showPicker?: () => void }) | null;
                          if (dateInput?.showPicker) {
                            event.preventDefault();
                            dateInput.showPicker();
                          }
                        }}
                      >
                        Date
                        <input
                          name="date"
                          type="date"
                          className="gst-invoice-date"
                          required
                          value={parseInvoiceDate(invoiceDateInput)}
                          onChange={(event) => {
                            const isoDate = event.target.value;
                            setInvoiceDateInput(formatInvoiceDate(isoDate));
                            if (isoDate && !editing.id) setInvoiceNumber(nextInvoiceNumber(isoDate, invoices, business?.data.name || ""));
                          }}
                        />
                      </label>
                      <label>
                        Transport name <small>Optional</small>
                        <input name="transport" defaultValue={editing.data.transport} placeholder="Transporter name" />
                      </label>
                      <label className="gst-full">
                        Purchaser
                        <GstSelect
                          ariaLabel="Purchaser"
                          value={customerId}
                          onChange={setCustomerId}
                          placeholder="Select purchaser"
                          options={customers.map((c) => ({
                            value: c.id,
                            label: c.data.name,
                            detail: c.data.state
                              ? `${c.data.state} (${cleanStateCode(c.data.stateCode || stateCodeFor(c.data.state))})`
                              : undefined,
                          }))}
                        />{" "}
                        {!customers.length && <small>Add a purchaser first from the Customers tab.</small>}
                      </label>
                      <div className="gst-full gst-supply-kind">
                        Tax treatment <strong>{interstate ? "Inter-state · IGST" : "Intra-state · CGST + SGST"}</strong>
                        <span>Automatically based on your business and purchaser states.</span>
                      </div>
                      <div className="gst-full gst-invoice-items">
                        <div className="gst-items-title">
                          <strong>Invoice items</strong>
                          <button
                            type="button"
                            className="gst-subtle-button"
                            onClick={() =>
                              setItems([...items, { name: "", description: "", hsn: "", quantity: 1, price: 0 }])
                            }
                          >
                            <Plus size={13} /> Add item
                          </button>
                        </div>
                        <div className="gst-invoice-grid-labels">
                          <span>Product name</span>
                          <span>HSN code</span>
                          <span>Qty</span>
                          <span>Rate / unit (taxable)</span>
                          <span>Line total (incl. tax)</span>
                          <i></i>
                        </div>
                        {items.map((item, index) => (
                          <div className="gst-invoice-line" key={index}>
                            <input
                              aria-label="Product name"
                              placeholder="Product name"
                              value={item.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                const match = hsnEntries.find(
                                  (entry) => entry.data.name.toLowerCase() === name.trim().toLowerCase(),
                                );
                                setItems(
                                  items.map((x, i) =>
                                    i === index
                                      ? { ...x, name, hsnId: match?.id || "", hsn: match?.data.hsn || "" }
                                      : x,
                                  ),
                                );
                              }}
                              required
                            />
                            <GstSelect
                              ariaLabel="HSN code"
                              value={item.hsnId || hsnEntries.find((entry) => entry.data.hsn === item.hsn)?.id || ""}
                              onChange={(value) => {
                                const entry = hsnEntries.find((candidate) => candidate.id === value);
                                setItems(
                                  items.map((x, i) =>
                                    i === index ? { ...x, hsnId: entry?.id || "", hsn: entry?.data.hsn || "" } : x,
                                  ),
                                );
                              }}
                              placeholder="Select HSN code"
                              options={hsnEntries.map((entry) => ({
                                value: entry.id,
                                label: entry.data.hsn,
                                detail: entry.data.name,
                              }))}
                            />{" "}
                            <input
                              aria-label="Quantity"
                              title="Quantity"
                              placeholder="Qty"
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={item.quantity}
                              onChange={(e) =>
                                setItems(
                                  items.map((x, i) => (i === index ? { ...x, quantity: Number(e.target.value) } : x)),
                                )
                              }
                            />
                            <input
                              aria-label="Taxable rate per unit"
                              title="Rate per unit before tax"
                              placeholder="Rate ₹"
                              type="number"
                              min="0"
                              step="0.001"
                              required
                              value={rateDrafts[index] ?? item.price.toFixed(3)}
                              onChange={(e) => {
                                setRateDrafts({ ...rateDrafts, [index]: e.target.value });
                                setTotalDrafts((drafts) => { const next = { ...drafts }; delete next[index]; return next; });
                              }}
                              onBlur={() => {
                                if (rateDrafts[index] !== undefined) {
                                  const price = Number(rateDrafts[index]);
                                  if (Number.isFinite(price)) setItems((current) => current.map((x, i) => i === index ? { ...x, price: Math.max(0, price) } : x));
                                  setRateDrafts((drafts) => { const next = { ...drafts }; delete next[index]; return next; });
                                }
                              }}
                            />
                            <input
                              aria-label="Line total including tax"
                              title="Enter total including 5% tax"
                              placeholder="Incl. tax ₹"
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={totalDrafts[index] ?? (item.quantity * item.price * 1.05).toFixed(2)}
                              onChange={(e) => setTotalDrafts({ ...totalDrafts, [index]: e.target.value })}
                              onBlur={() => {
                                const amount = Number(totalDrafts[index]);
                                if (Number.isFinite(amount))
                                  setItems(
                                    items.map((x, i) =>
                                      i === index
                                        ? {
                                            ...x,
                                            price:
                                              Math.round((amount / (Math.max(1, x.quantity) * 1.05)) * 1000) / 1000,
                                          }
                                        : x,
                                    ),
                                  );
                                setTotalDrafts((drafts) => {
                                  const next = { ...drafts };
                                  delete next[index];
                                  return next;
                                });
                              }}
                            />
                            <button
                              type="button"
                              className="gst-icon-btn"
                              aria-label="Remove line"
                              onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== index) : items)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="gst-full gst-totals">
                        <div>
                          <span>Taxable amount</span>
                          <strong>{money(subtotal)}</strong>
                        </div>
                        <div>
                          <span>{interstate ? "IGST 5%" : "CGST 2.5% + SGST 2.5%"}</span>
                          <strong>{money(taxAmount)}</strong>
                        </div>
                        <div>
                          <span>Round off</span>
                          <strong>
                            {roundOff < 0 ? "−" : "+"}
                            {money(Math.abs(roundOff))}
                          </strong>
                        </div>
                        <div className="gst-total">
                          <span>Total payable</span>
                          <strong>{money(payable)}</strong>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="gst-form-actions">
                    <button type="button" className="gst-cancel" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button
                      className="primary-button"
                      disabled={
                        busy ||
                        (editing.kind === "invoice" &&
                          (!customerId || !items.some((i) => i.name.trim() && i.hsn.trim())))
                      }
                    >
                      {busy ? "Saving…" : "Save details"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
