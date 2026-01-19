// controllers/invoiceController.js
const Invoice = require("../models/Invoice");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const path = require("path");
const numberToWords = require("number-to-words");

exports.addEntry = async (req, res) => {
  try {
    const {
      invoiceNumber,
      customerName,
      customerContact,
      customerAddress,
      entry,
    } = req.body;
    console.log("Received entry:", req.body);

    // Convert numeric fields
    entry.weight = Number(entry.weight);
    entry.rate = Number(entry.rate);
    entry.freight = Number(entry.freight);
    entry.whCharges = Number(entry.whCharges);
    entry.loadingCharges = Number(entry.loadingCharges);

    // Find invoice or create new
    let invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) {
      invoice = new Invoice({
        invoiceNumber,
        customerName,
        customerContact,
        customerAddress,
        entries: [],
      });
    }

    invoice.entries.push(entry);
    await invoice.save();

    res.json({ success: true, invoice });
  } catch (err) {
    console.error("Error in addEntry:", err);
    res.status(500).json({ error: "Error adding entry: " + err.message });
  }
};

// Get invoice
exports.getInvoiceByNumber = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const invoice = await Invoice.findOne({ invoiceNumber });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerContact: invoice.customerContact,
      customerAddress: invoice.customerAddress,
      entries: invoice.entries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// save invoice
exports.saveInvoice = async (req, res) => {
  console.log("save invoice backend is working");
  try {
    const {
      invoiceNumber,
      customerName,
      customerContact,
      customerAddress,
      entries,
    } = req.body;

    // Check if invoice already exists
    let invoice = await Invoice.findOne({ invoiceNumber });

    if (invoice) {
      // Update existing invoice
      invoice.customerName = customerName;
      invoice.customerContact = customerContact;
      invoice.customerAddress = customerAddress;
      invoice.entries = entries;
      invoice.updatedAt = new Date();

      console.log("Updating existing invoice:", invoiceNumber);
    } else {
      // Create new invoice
      invoice = new Invoice({
        invoiceNumber,
        customerName,
        customerContact,
        customerAddress,
        entries,
      });
      console.log("Creating new invoice:", invoiceNumber);
    }

    await invoice.save();

    res.json({
      success: true,
      invoice,
      message: invoice
        ? "Invoice updated successfully"
        : "Invoice created successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// preview invoice number
exports.previewNextNumber = async (req, res) => {
  try {
    const Counter = require("../models/Counter");

    const counter = await Counter.findOne({ name: "invoiceNumber" });

    if (!counter) {
      // Counter doesn't exist yet - next number would be 3100
      res.json({ previewInvoiceNumber: "3100" });
    } else {
      // Show what the NEXT number would be (current + 1) WITHOUT incrementing
      const nextNumber = 3100 + counter.value;
      res.json({ previewInvoiceNumber: nextNumber.toString() });
    }
  } catch (error) {
    console.error("Error getting preview invoice number:", error);
    res.status(500).json({ error: "Failed to get preview invoice number" });
  }
};

// next invoice number
exports.nextNumber = async (req, res) => {
  try {
    const Counter = require("../models/Counter");

    const counter = await Counter.findOneAndUpdate(
      { name: "invoiceNumber" },
      { $inc: { value: 1 } },
      { new: true, upsert: true },
    );

    // Start from 3100
    const nextNumber = 3100 + counter.value;
    res.json({ nextInvoiceNumber: nextNumber.toString() });
  } catch (error) {
    console.error("Error getting next invoice number:", error);
    res.status(500).json({ error: "Failed to get next invoice number" });
  }
};

exports.newInvoice = async (req, res) => {
  try {
    const { invoiceNumber, customerName, customerContact, customerAddress } =
      req.body;

    const invoice = new Invoice({
      invoiceNumber,
      customerName,
      customerContact,
      customerAddress,
      entries: [],
    });

    await invoice.save();
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.savePDF = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const doc = new PDFDocument({ margin: 30, size: "A4" });

    // Set headers for PDF download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice ${invoiceNumber}.pdf`,
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    const fs = require("fs");
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const pageMargin = 30;

    // -------- Large Centered Logo ----------
    const logoPath = path.join(__dirname, "../public/logo.png");
    if (fs.existsSync(logoPath)) {
      // Center the logo horizontally (60% of page width)
      const logoWidth = pageWidth * 0.6;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.image(logoPath, logoX, 20, { width: logoWidth });
    }

    // Draw line below logo
    const lineY = 150;
    doc
      .moveTo(pageMargin, lineY)
      .lineTo(pageWidth - pageMargin, lineY)
      .stroke();

    // -------- Company Address & Contact --------
    doc.fontSize(13).font("Helvetica-Bold");

    // Company Address (centered)
    const addressText =
      "Urja Residency, Flat No. 206, Opp. Ziggurat Co-op. Society Gate, Katraj Bypass Highway, Ambegaon (Bk), Pune – 411046.";
    doc.text(addressText, pageMargin, 110 + 55, {
      align: "center",
      width: pageWidth - pageMargin * 2,
      lineGap: 5, // Adds 8px space between wrapped lines
    });

    const lY = 180 + 60;
    doc
      .moveTo(pageMargin, lY)
      .lineTo(pageWidth - pageMargin, lY)
      .stroke();

    // Contact & Email (centered)
    const contactY = 120 + 90;
    const contactText =
      "Contact: +91-9850749309 / +91-7387919999    Email - sgroadlines10@gmail.com";
    doc.text(contactText, pageMargin, contactY, {
      align: "center",
      width: pageWidth - pageMargin * 2,
    });

    // Draw line below address
    // const lineBottomY = contactY + 60;
    // doc
    //   .moveTo(pageMargin, lineBottomY)
    //   .lineTo(pageWidth - pageMargin, lineBottomY)
    //   .stroke();

    // Draw WHITE line below address
    const lineBottomY = contactY + 80;
    doc
      .moveTo(pageMargin, lineBottomY)
      .lineTo(pageWidth - pageMargin, lineBottomY)
      .stroke("white"); // Stroke with white color only for this line

    // -------- INVOICE Text CENTERED on the line --------
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("INVOICE", pageMargin, lineBottomY - 18, {
        align: "center",
        width: pageWidth - pageMargin * 2,
      });

    // -------- Bill To Section --------
    const billToY = lineBottomY + 30;
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Bill to,", pageMargin, billToY);
    doc
      .font("Helvetica")
      .text(`M/s ${invoice.customerName}`, pageMargin, billToY + 15);

    // Add customer address if available
    if (invoice.customerContact) {
      doc.text(invoice.customerContact, pageMargin, billToY + 30);
    }

    if (invoice.customerAddress) {
      doc.text(invoice.customerAddress, pageMargin + 80, billToY + 30);
    }

    // -------- Bill No & Bill Date Box (right aligned) --------
    const boxWidth = 180;
    const boxHeight = 40;
    const boxX = pageWidth - pageMargin - boxWidth;
    const boxY = billToY;

    // Draw the box
    doc.rect(boxX, boxY, boxWidth, boxHeight).stroke("black");

    // Add "Bill No" and "Bill Date" headers
    const headerY = boxY + 8;
    const contentY = boxY + 22;

    // Bill No header
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Bill No", boxX + 15, headerY);

    // Bill Date header
    doc.text("Bill Date", boxX + 100, headerY);

    // Format current date as DD-MMM-YYYY (like 26-Aug-2025)
    const currentDate = new Date();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const formattedDate = `${currentDate.getDate().toString().padStart(2, "0")}-${months[currentDate.getMonth()]}-${currentDate.getFullYear()}`;

    // Bill No value
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(invoiceNumber || "N/A", boxX + 15, contentY);

    // Bill Date value
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(formattedDate, boxX + 100, contentY);

    // Draw separator line in the box
    doc
      .moveTo(boxX + 80, boxY + 5)
      .lineTo(boxX + 80, boxY + boxHeight - 5)
      .stroke();

    // Move down after the bill section
    doc.moveDown(2);

    // -------- Table Headers --------
    const tableTop = doc.y;

    // Adjusted column widths to prevent overflow
    const columnWidths = [55, 55, 110, 60, 45, 55, 43, 55, 55];
    const totalTableWidth = columnWidths.reduce((a, b) => a + b, 0);

    // Center table
    let tableStartX = pageMargin;
    if (totalTableWidth < pageWidth - pageMargin * 2) {
      tableStartX = (pageWidth - totalTableWidth) / 2;
    }

    const headers = [
      "Load Dt",
      "Vehicle No.",
      "From - To",
      "Challan No.",
      "Weight",
      "Ch Weight",
      "Rate",
      "Freight",
      "Sub Total",
    ];

    let x = tableStartX;
    doc.font("Helvetica-Bold").fontSize(8); // Reduced font size for headers

    // Draw table header with background
    headers.forEach((h, i) => {
      // Header cell with light gray background
      doc
        .rect(x, tableTop, columnWidths[i], 20)
        .fillAndStroke("#f5f5f5", "#333");
      doc.fillColor("#000").text(h, x + 3, tableTop + 6, {
        width: columnWidths[i] - 6,
        align: "center",
        lineBreak: false,
      });
      x += columnWidths[i];
    });

    // -------- Table Rows --------
    let y = tableTop + 20;
    doc.font("Helvetica").fontSize(8).fillColor("#000");

    invoice.entries.forEach((entry) => {
      x = tableStartX;

      // Format date
      let loadDate = "";
      if (entry.loadingDate) {
        if (entry.loadingDate instanceof Date) {
          loadDate = entry.loadingDate.toLocaleDateString("en-GB");
        } else {
          loadDate = String(entry.loadingDate);
        }
      }

      // Calculate subtotal
      const subTotal = parseFloat(entry.freight) || 0;

      // FIXED: Convert all values to strings before using substring
      const vehicleNoStr = String(entry.vehicleNo || "");
      const fromStr = String(entry.from || "");
      const toStr = String(entry.to || "");
      const challanNoStr = String(entry.challanNo || "");

      // Row data - trim long texts
      const rowData = [
        loadDate,
        vehicleNoStr.length > 10 ? vehicleNoStr.substring(0, 10) : vehicleNoStr,
        `${fromStr.length > 15 ? fromStr.substring(0, 15) : fromStr} -> ${toStr.length > 15 ? toStr.substring(0, 15) : toStr}`,
        challanNoStr.length > 8 ? challanNoStr.substring(0, 8) : challanNoStr,
        parseFloat(entry.weight || 0).toFixed(2),
        parseFloat(entry.chWeight || 0).toFixed(2),
        parseFloat(entry.rate || 0).toFixed(2),
        parseFloat(entry.freight || 0).toFixed(2),
        subTotal.toFixed(2),
      ];

      // Draw row cells
      rowData.forEach((cellData, i) => {
        // Draw cell border
        doc.rect(x, y, columnWidths[i], 22).stroke();

        // Add cell content
        doc.text(String(cellData), x + 3, y + 8, {
          width: columnWidths[i] - 6,
          align: "center",
          lineBreak: false,
        });
        x += columnWidths[i];
      });

      y += 22;

      // Add new page if needed
      if (y > pageHeight - 250) {
        doc.addPage();
        y = pageMargin + 20;
      }
    });

    // Draw bottom line of table
    doc
      .moveTo(tableStartX, y)
      .lineTo(tableStartX + totalTableWidth, y)
      .stroke();

    // -------- Amount in Words Box --------
    const totalAmount = invoice.entries.reduce(
      (sum, e) => sum + (parseFloat(e.freight) || 0),
      0,
    );
    const amountWords =
      numberToWords.toWords(Math.round(totalAmount)) + " Only";

    const wordsBoxY = y + 20;
    const wordsBoxWidth = pageWidth * 0.6;

    // Draw box for amount in words
    doc.rect(pageMargin, wordsBoxY, wordsBoxWidth, 45).stroke();
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Amount In Words:", pageMargin + 10, wordsBoxY + 8);
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(amountWords, pageMargin + 10, wordsBoxY + 22, {
        width: wordsBoxWidth - 20,
      });

    // -------- Totals Box (beside amount in words) --------
    const totalsBoxX = pageMargin + wordsBoxWidth + 20;
    const totalsBoxWidth = pageWidth - totalsBoxX - pageMargin;

    // Draw box for totals
    doc.rect(totalsBoxX, wordsBoxY, totalsBoxWidth, 45).stroke();

    const totalsContentX = totalsBoxX + 10;
    const subTotalY = wordsBoxY + 10;
    const totalY = wordsBoxY + 25;

    // Sub Total
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("Sub Total:", totalsContentX, subTotalY, {
        width: totalsBoxWidth - 40,
      });
    doc
      .font("Helvetica-Bold")
      .text(totalAmount.toFixed(2), totalsContentX, subTotalY, {
        align: "right",
        width: totalsBoxWidth - 40,
      });

    // Total (bold)
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Total:", totalsContentX, totalY, {
        width: totalsBoxWidth - 40,
      });
    doc.text(totalAmount.toFixed(2), totalsContentX, totalY, {
      align: "right",
      width: totalsBoxWidth - 40,
    });

    // -------- Bank Details Box --------
    const bankBoxY = wordsBoxY + 70;
    const bankBoxHeight = 105; // Reduced height
    const bankBoxWidth = pageWidth * 0.6;

    // Draw box for bank details
    doc.rect(pageMargin, bankBoxY, bankBoxWidth, bankBoxHeight).stroke();

    // Bank Details Heading
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Bank Account Details For NEFT/RTGS", pageMargin + 8, bankBoxY + 8);

    // Bank Details Content - with proper line spacing
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Account Number : 37401700100011", pageMargin + 8, bankBoxY + 25)
      .text("IFSC : SRCB0000374", pageMargin + 8, bankBoxY + 38)
      .text("Bank : Saraswat Co-operative Bank", pageMargin + 8, bankBoxY + 51)
      .text("Branch : Sinhgad Road, Pune", pageMargin + 8, bankBoxY + 64)
      .text("PIN : 411051", pageMargin + 8, bankBoxY + 77)
      .text("PAN : ABXFS3719C", pageMargin + 8, bankBoxY + 90);

    // -------- Stamp Box (filled with stamp) --------
    const stampPath = path.join(__dirname, "../public/stamp.jpg");
    const stampBoxX = pageMargin + bankBoxWidth + 20;
    const stampBoxWidth = pageWidth - stampBoxX - pageMargin;

    // Draw box for stamp
    // doc.rect(stampBoxX, bankBoxY, stampBoxWidth, bankBoxHeight).stroke();

    if (fs.existsSync(stampPath)) {
      try {
        // Make stamp fill the box (with padding)
        const stampPadding = 10;
        const maxStampWidth = stampBoxWidth - stampPadding * 2;
        const maxStampHeight = bankBoxHeight - stampPadding * 2;

        // Add stamp image centered in the box
        const stampX = stampBoxX + stampPadding;
        const stampY = bankBoxY + stampPadding;

        doc.image(stampPath, stampX, stampY, {
          width: maxStampWidth + 5,
          height: maxStampHeight + 5,
        });
      } catch (stampErr) {
        console.log("Stamp error:", stampErr.message);
        // If stamp fails, just leave empty box
      }
    }

    // -------- Simple Signature Line --------
    const signatureY = bankBoxY + bankBoxHeight + 50;
    doc
      .moveTo(pageWidth - 150, signatureY)
      .lineTo(pageWidth - pageMargin, signatureY)
      .stroke();

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Authorized Signature", pageWidth - 150, signatureY + 5, {
        width: 120,
        align: "center",
      });

    doc.end();
  } catch (err) {
    console.error("PDF Generation Error:", err);
    // Send error response before ending
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

// Export all invoices to Excel
exports.exportExcel = async (req, res) => {
  try {
    const invoices = await Invoice.find({}); // get all invoices

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Invoices");

    sheet.columns = [
      { header: "Invoice Number", key: "invoiceNumber", width: 15 },
      { header: "Customer Name", key: "customerName", width: 25 },
      { header: "Customer Contact", key: "customerContact", width: 20 },
      { header: "Customer Address", key: "customerAddress", width: 30 },
      { header: "From", key: "from", width: 15 },
      { header: "To", key: "to", width: 15 },
      { header: "Vehicle No", key: "vehicleNo", width: 12 },
      { header: "Challan No", key: "challanNo", width: 12 },
      { header: "Weight", key: "weight", width: 10 },
      { header: "Rate", key: "rate", width: 10 },
      { header: "Freight", key: "freight", width: 12 },
      { header: "WH Charges", key: "whCharges", width: 12 },
      { header: "Loading Charges", key: "loadingCharges", width: 12 },
      { header: "Loading Date", key: "loadingDate", width: 15 },
      { header: "Bill Date", key: "billDate", width: 15 },
    ];

    invoices.forEach((inv) => {
      inv.entries.forEach((entry) => {
        sheet.addRow({
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          customerContact: inv.customerContact,
          customerAddress: inv.customerAddress,
          from: entry.from,
          to: entry.to,
          vehicleNo: entry.vehicleNo,
          challanNo: entry.challanNo,
          weight: entry.weight,
          rate: entry.rate,
          freight: entry.freight,
          whCharges: entry.whCharges,
          loadingCharges: entry.loadingCharges,
          loadingDate: entry.loadingDate
            ? entry.loadingDate.toISOString().split("T")[0]
            : "",
          billDate: entry.billDate
            ? entry.billDate.toISOString().split("T")[0]
            : "",
        });
      });
    });

    // Important: set headers BEFORE writing
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=invoices.xlsx");

    await workbook.xlsx.write(res); // write Excel to response
    res.end(); // finish response
  } catch (err) {
    console.error("Error exporting Excel:", err);
    // Send proper status code, not JSON if headers already sent
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.end();
    }
  }
};

// controllers/InvoiceController.js
exports.getInvoiceEntries = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const invoice = await Invoice.findOne({ invoiceNumber });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.json({ entries: invoice.entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
