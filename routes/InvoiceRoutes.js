// routes/invoiceRoutes.js
const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/InvoiceController");

router.post("/add-entry", invoiceController.addEntry);
router.post("/new-invoice", invoiceController.newInvoice);
router.get("/next-number", invoiceController.nextNumber);
router.get("/preview-next-number", invoiceController.previewNextNumber);
router.get("/export-excel", invoiceController.exportExcel);
router.get("/:invoiceNumber", invoiceController.getInvoiceByNumber);
router.get("/:invoiceNumber/pdf", invoiceController.savePDF);
router.post("/save", invoiceController.saveInvoice);
module.exports = router;
