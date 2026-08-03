import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generate a PDF for a completed stock transfer
 */
export const generateTransferPDF = (transfer) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      
      const fileName = `TRF-${transfer.transferNumber}.pdf`;
      const publicDir = path.join(process.cwd(), 'public', 'transfers');
      
      // Ensure directories exist
      if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
        fs.mkdirSync(path.join(process.cwd(), 'public'));
      }
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
      }

      const filePath = path.join(publicDir, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // --- Header Design ---
      doc.fillColor('#0275d8').fontSize(24).text('StockPilot', 50, 50);
      doc.fillColor('#444444').fontSize(10).text('Warehouse Logistics Management System', 50, 75);
      
      doc.fillColor('#333333').fontSize(14).text('STOCK TRANSFER INVOICE', 50, 110, { align: 'right' });
      doc.fontSize(10).text(`Transfer Number: ${transfer.transferNumber}`, 50, 130, { align: 'right' });
      doc.text(`Date: ${new Date(transfer.completedAt || transfer.updatedAt).toLocaleDateString()}`, 50, 145, { align: 'right' });

      doc.moveDown(2);
      
      // Draw horizontal line
      doc.strokeColor('#dddddd').lineWidth(1).moveTo(50, 170).lineTo(550, 170).stroke();

      // --- Warehouses Section ---
      doc.fontSize(12).fillColor('#0275d8').text('Source Location', 50, 190);
      doc.fontSize(10).fillColor('#333333').text(`Name: ${transfer.sourceWarehouseId.name}`, 50, 210);
      doc.text(`Code: ${transfer.sourceWarehouseId.code}`, 50, 225);

      doc.fontSize(12).fillColor('#0275d8').text('Destination Location', 300, 190);
      doc.fontSize(10).fillColor('#333333').text(`Name: ${transfer.destinationWarehouseId.name}`, 300, 210);
      doc.text(`Code: ${transfer.destinationWarehouseId.code}`, 300, 225);

      doc.moveDown(4);

      // Draw table header
      let y = 270;
      doc.strokeColor('#dddddd').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
      
      y += 10;
      doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold');
      doc.text('SKU', 55, y);
      doc.text('Product Name', 160, y);
      doc.text('Quantity', 450, y, { width: 90, align: 'right' });

      y += 15;
      doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
      
      doc.font('Helvetica');

      // Table rows
      transfer.items.forEach((item) => {
        y += 10;
        
        // Product Name truncation if too long
        const prodName = item.productId.name.length > 40 
          ? item.productId.name.substring(0, 37) + '...' 
          : item.productId.name;

        doc.text(item.productId.sku, 55, y);
        doc.text(prodName, 160, y);
        doc.text(item.quantity.toString(), 450, y, { width: 90, align: 'right' });
        
        y += 15;
        doc.strokeColor('#eeeeee').lineWidth(0.5).moveTo(50, y).lineTo(550, y).stroke();
      });

      // Footer
      doc.moveDown(4);
      doc.fontSize(10).fillColor('#888888').text('Notes:', 50, y + 30);
      doc.fontSize(9).text(transfer.notes || 'No notes provided.', 50, y + 45);

      doc.fontSize(9).text('Issued by StockPilot Inventory System. Authenticated transaction ledger.', 50, 700, { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(`/transfers/${fileName}`);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
