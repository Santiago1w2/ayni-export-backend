import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { Agreement, Company } from "../types/agreement.types";

const C = {
  primary: rgb(18 / 255, 55 / 255, 42 / 255),
  background: rgb(248 / 255, 250 / 255, 248 / 255),
  gray: rgb(107 / 255, 117 / 255, 111 / 255),
  green: rgb(47 / 255, 179 / 255, 68 / 255),
  white: rgb(1, 1, 1),
  border: rgb(220 / 255, 227 / 255, 222 / 255),
};
const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 48;

function pdfSafe(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of pdfSafe(text).replace(/\r/g, "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function formatDate(value?: string): string {
  if (!value) return "To be confirmed";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function companyCard(page: PDFPage, company: Company, title: string, x: number, y: number, width: number, regular: PDFFont, bold: PDFFont): void {
  page.drawRectangle({ x, y, width, height: 112, color: C.white, borderColor: C.border, borderWidth: 1 });
  page.drawText(title, { x: x + 14, y: y + 89, size: 8, font: bold, color: C.green });
  const values = [company.name, company.country, company.taxId ? `Tax ID: ${company.taxId}` : "", company.representative ? `Representative: ${company.representative}` : ""].filter(Boolean);
  let lineY = y + 68;
  values.forEach((value, index) => {
    const size = index === 0 ? 11 : 8.5;
    const selectedFont = index === 0 ? bold : regular;
    for (const line of wrapText(value, selectedFont, size, width - 28).slice(0, index === 0 ? 2 : 1)) {
      page.drawText(line, { x: x + 14, y: lineY, size, font: selectedFont, color: index === 0 ? C.primary : C.gray });
      lineY -= 13;
    }
  });
}

export async function generateAgreementPdf(agreement: Agreement): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const addPage = (continuation = false): PDFPage => {
    const page = pdf.addPage(PAGE);
    page.drawRectangle({ x: 0, y: 0, width: PAGE[0], height: PAGE[1], color: C.background });
    page.drawRectangle({ x: 0, y: PAGE[1] - 100, width: PAGE[0], height: 100, color: C.primary });
    page.drawText("AYNI EXPORTS", { x: MARGIN, y: PAGE[1] - 47, size: 18, font: bold, color: C.white });
    page.drawText(continuation ? "Commercial Trade Agreement · Continuation" : "Commercial Trade Agreement", { x: MARGIN, y: PAGE[1] - 70, size: 10, font: regular, color: rgb(0.78, 0.88, 0.82) });
    page.drawText("AYNI  >", { x: PAGE[0] - 105, y: PAGE[1] - 56, size: 13, font: bold, color: C.green });
    return page;
  };

  let page = addPage();
  const createdAt = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date());
  page.drawText(pdfSafe(`Agreement ${agreement.agreementId}`), { x: MARGIN, y: 712, size: 18, font: bold, color: C.primary });
  page.drawText(pdfSafe(`Generated: ${createdAt}`), { x: 420, y: 714, size: 8, font: regular, color: C.gray });
  const cardWidth = (PAGE[0] - MARGIN * 2 - 16) / 2;
  companyCard(page, agreement.exporter, "EXPORTER", MARGIN, 574, cardWidth, regular, bold);
  companyCard(page, agreement.importer, "IMPORTER", MARGIN + cardWidth + 16, 574, cardWidth, regular, bold);

  page.drawText("TRADE DETAILS", { x: MARGIN, y: 545, size: 9, font: bold, color: C.green });
  const details = [
    ["Product", agreement.product],
    ["Quantity", `${agreement.quantityTonnes.toLocaleString("en-US")} tonnes`],
    ["Price", `${agreement.currency} ${agreement.pricePerKg.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/kg`],
    ["Destination", agreement.destination || "To be confirmed"],
    ["Incoterm", agreement.incoterm || "To be confirmed"],
    ["Delivery", formatDate(agreement.estimatedDelivery)],
  ];
  let y = 518;
  for (const [label, value] of details) {
    page.drawText(label, { x: MARGIN, y, size: 9, font: bold, color: C.gray });
    page.drawText(pdfSafe(value), { x: 165, y, size: 10, font: regular, color: C.primary, maxWidth: 370 });
    page.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: PAGE[0] - MARGIN, y: y - 8 }, thickness: 0.5, color: C.border });
    y -= 28;
  }

  const total = agreement.quantityTonnes * 1000 * agreement.pricePerKg;
  page.drawRectangle({ x: MARGIN, y: 304, width: PAGE[0] - MARGIN * 2, height: 68, color: C.primary });
  page.drawText("ESTIMATED TRADE VALUE", { x: MARGIN + 18, y: 346, size: 8, font: bold, color: rgb(0.72, 0.85, 0.77) });
  page.drawText(`${agreement.currency} ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: MARGIN + 18, y: 320, size: 21, font: bold, color: C.white });

  page.drawText("TERMS / NOTES", { x: MARGIN, y: 278, size: 9, font: bold, color: C.green });
  const notes = wrapText(agreement.notes?.trim() || "Commercial conditions are subject to confirmation by both parties.", regular, 9, PAGE[0] - MARGIN * 2);
  let noteY = 258;
  let current = page;
  for (const line of notes) {
    if (noteY < 135) {
      current = addPage(true);
      noteY = 700;
      current.drawText("TERMS / NOTES (CONTINUED)", { x: MARGIN, y: 730, size: 9, font: bold, color: C.green });
    }
    if (line) current.drawText(line, { x: MARGIN, y: noteY, size: 9, font: regular, color: C.gray });
    noteY -= 13;
  }

  const signatureY = 88;
  current.drawLine({ start: { x: MARGIN, y: signatureY }, end: { x: 235, y: signatureY }, thickness: 1, color: C.gray });
  current.drawLine({ start: { x: 355, y: signatureY }, end: { x: PAGE[0] - MARGIN, y: signatureY }, thickness: 1, color: C.gray });
  current.drawText("Exporter signature", { x: MARGIN, y: signatureY - 15, size: 8, font: regular, color: C.gray });
  current.drawText("Importer signature", { x: 355, y: signatureY - 15, size: 8, font: regular, color: C.gray });

  const pages = pdf.getPages();
  pages.forEach((pdfPage, index) => {
    pdfPage.drawText("Documento generado por Ayni Exports como resumen preliminar del acuerdo comercial. No constituye asesoría legal.", { x: MARGIN, y: 28, size: 6.7, font: regular, color: C.gray, maxWidth: 440 });
    pdfPage.drawText(`${index + 1} / ${pages.length}`, { x: 515, y: 28, size: 7, font: regular, color: C.gray });
  });
  pdf.setTitle(`Ayni Exports - ${agreement.agreementId}`);
  pdf.setAuthor("Ayni Exports");
  return pdf.save();
}

export async function generateCompletionPdf(agreement: Agreement, completedAt: Date): Promise<Uint8Array> {
  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),page=pdf.addPage(PAGE);
  page.drawRectangle({x:0,y:0,width:PAGE[0],height:PAGE[1],color:C.background});page.drawRectangle({x:0,y:PAGE[1]-150,width:PAGE[0],height:150,color:C.primary});
  page.drawText("AYNI EXPORTS",{x:MARGIN,y:PAGE[1]-48,size:17,font:bold,color:C.white});page.drawText("EXPORT COMPLETION RECEIPT",{x:MARGIN,y:PAGE[1]-88,size:20,font:bold,color:C.white});page.drawText("[OK] EXPORTACION COMPLETADA",{x:MARGIN,y:PAGE[1]-120,size:12,font:bold,color:C.green});
  let y=650;const total=agreement.quantityTonnes*1000*agreement.pricePerKg;const rows=[["Agreement",agreement.agreementId],["Exporter",agreement.exporter.name],["Importer",agreement.importer.name],["Product",agreement.product],["Quantity",`${agreement.quantityTonnes} tonnes`],["Price",`${agreement.currency} ${agreement.pricePerKg.toFixed(2)}/kg`],["Trade value",`${agreement.currency} ${total.toLocaleString("en-US",{minimumFractionDigits:2})}`],["Destination",agreement.destination||"-"],["Incoterm",agreement.incoterm||"-"],["Completed",completedAt.toISOString().slice(0,10)]];for(const[label,value]of rows){page.drawText(label,{x:MARGIN,y,size:9,font:bold,color:C.gray});page.drawText(pdfSafe(value),{x:170,y,size:11,font:regular,color:C.primary});y-=34}
  page.drawText("TIMELINE",{x:MARGIN,y:y-5,size:10,font:bold,color:C.green});for(const step of ["[OK] Comprador seleccionado","[OK] Documentacion revisada","[OK] Solicitud aceptada","[OK] Acuerdo registrado","[OK] Operacion marcada como completada"]){y-=24;page.drawText(step,{x:MARGIN,y,size:10,font:regular,color:C.primary})}
  page.drawText("Constancia interna de operacion registrada en Ayni Exports. No constituye un comprobante oficial de SUNAT, aduanas ni otra autoridad publica.",{x:MARGIN,y:35,size:7,font:regular,color:C.gray,maxWidth:490});return pdf.save();
}
