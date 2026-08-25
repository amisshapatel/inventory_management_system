import nodemailer from 'nodemailer';
import { NotificationSetting } from '../settings/model.js';
import Warehouse from '../warehouses/model.js';
import dns from 'dns';

// Create a transporter using environment variables
const createTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null; // Return null to fallback to console logging
  }

  let resolvedHost = host;
  try {
    const { address } = await dns.promises.lookup(host, { family: 4 });
    resolvedHost = address;
  } catch (err) {
    console.warn(`DNS lookup failed for SMTP host ${host}, falling back to original host:`, err);
  }

  return nodemailer.createTransport({
    host: resolvedHost,
    port: parseInt(port, 10),
    secure: parseInt(port, 10) === 465, // true for 465, false for other ports
    auth: {
      user,
      pass
    },
    tls: {
      servername: host
    }
  });
};

// Generate email body depending on eventType
const generateEmailTemplate = async (eventType, data) => {
  let subject = '';
  let html = '';

  switch (eventType) {
    case 'low_stock': {
      let whName = 'Default Warehouse';
      try {
        const wh = await Warehouse.findById(data.warehouseId);
        if (wh) whName = wh.name;
      } catch (e) {}

      subject = `⚠️ Low Stock Alert: ${data.productName} (${data.sku})`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #d9534f; margin-top: 0;">⚠️ Low Stock Alert</h2>
          <p>This is to inform you that the stock level for the following item has fallen below its defined minimum threshold.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Product:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.productName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">SKU:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.sku}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Warehouse:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${whName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee; color: #d9534f;">Current Stock:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #d9534f;">${data.currentStock}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Min Threshold:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.minimumStock}</td>
            </tr>
          </table>
          <p>Please log in to the StockPilot panel to create a Purchase Entry and replenish inventory.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">This is an automated system email from StockPilot.</p>
        </div>
      `;
      break;
    }
    case 'stock_transfer': {
      subject = `🚚 Stock Transfer Completed: TRF-${data.transferNumber}`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #0275d8; margin-top: 0;">🚚 Stock Transfer Completed</h2>
          <p>Stock transfer <strong>TRF-${data.transferNumber}</strong> has been successfully finalized.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Source:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.sourceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Destination:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.destinationName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Items Transferred:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.totalItems}</td>
            </tr>
          </table>
          <p>A copy of the transfer invoice PDF has been compiled and saved to the registry.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">This is an automated system email from StockPilot.</p>
        </div>
      `;
      break;
    }
    case 'import_failed': {
      subject = `❌ Product Import Failure`;
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #d9534f; margin-top: 0;">❌ Product Import Failed</h2>
          <p>An attempt to import products from CSV has failed validation audits.</p>
          <p><strong>Reason / Error Details:</strong></p>
          <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #d9534f; margin: 10px 0;">
            ${data.errorMessage}
          </blockquote>
          <p>Please double-check the column mapping selections and data formatting rules before uploading again.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">This is an automated system email from StockPilot.</p>
        </div>
      `;
      break;
    }
    default: {
      subject = `🔔 StockPilot Notification: ${eventType}`;
      html = `<p>Notification trigger: ${eventType} was fired. Data: ${JSON.stringify(data)}</p>`;
    }
  }

  return { subject, html };
};

export const triggerEmailAlert = async (eventType, data) => {
  try {
    // 1. Check if event is enabled in NotificationSettings
    const setting = await NotificationSetting.findOne({ eventType });
    if (!setting || !setting.enabled || !setting.recipients || setting.recipients.length === 0) {
      console.log(`Notification event '${eventType}' is disabled or has no recipients configured. Skipping email.`);
      return;
    }

    const { subject, html } = await generateEmailTemplate(eventType, data);

    const transporter = await createTransporter();
    const fromAddress = process.env.SMTP_FROM || 'noreply@stockpilot.com';
    const toList = setting.recipients.join(', ');

    if (!transporter) {
      console.log('----------------------------------------------------');
      console.log(`[SMTP Not Configured] Logging notification email to Console:`);
      console.log(`To: ${toList}`);
      console.log(`From: ${fromAddress}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body (HTML):\n${html}`);
      console.log('----------------------------------------------------');
      return;
    }

    // Send the email
    const mailOptions = {
      from: fromAddress,
      to: toList,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Notification email sent: ${info.messageId} (Event: ${eventType})`);
  } catch (error) {
    console.error(`Failed to trigger notification email for event '${eventType}':`, error);
  }
};

