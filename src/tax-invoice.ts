import { generateFromHtml } from '@oneblink/sdk/pdfs';
import OneBlink from '@oneblink/sdk';
import moment from 'moment';
import mustache from 'mustache';

// Initialize the OneBlink Forms SDK
const formsSDK = new OneBlink.Forms({
  accessKey: process.env.FORMS_ACCESS_KEY,
  secretKey: process.env.FORMS_SECRET_KEY,
});

// HTML template for the Tax Invoice using Mustache syntax
const taxInvoiceTemplate = `
  <h1>Tax Invoice</h1>
  <p><strong>Invoice Date:</strong> {{invoiceDate}}</p>
  <p><strong>Invoice Number:</strong> {{transactionId}}</p>
  <p><strong>Customer Name:</strong> {{customerName}}</p>
  <p><strong>Amount Paid:</strong> ${{amountPaid}}</p>
  <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
  <p><strong>Payment Date:</strong> {{paymentDate}}</p>
`;

// Function to generate the Tax Invoice PDF
async function generateTaxInvoice(submission) {
  // Extract the payment and customer details from the submission
  const { quickStreamTransaction, customerDetails } = submission;

  // Prepare the data for the template
  const templateData = {
    invoiceDate: moment().format('YYYY-MM-DD'),
    transactionId: quickStreamTransaction.transactionId,
    customerName: customerDetails.name,
    amountPaid: (quickStreamTransaction.amount / 100).toFixed(2),
    paymentMethod: quickStreamTransaction.paymentMethod,
    paymentDate: moment(quickStreamTransaction.paymentDate).format('YYYY-MM-DD'),
  };

  // Render the HTML using Mustache
  const content = mustache.render(taxInvoiceTemplate, templateData);

  // Create a PDF from the rendered HTML content
  const pdfBuffer = await generateFromHtml(content);

  // Return the attachment in the expected format
  return [
    {
      filename: `Tax_Invoice_${quickStreamTransaction.transactionId}.pdf`,
      fileType: 'application/pdf',
      data: pdfBuffer.toString('base64'), // Base64-encoded PDF data
    },
  ];
}

// Example of using the function with a submission event
async function handleEmailPdfEvent(submission) {
  const attachments = await generateTaxInvoice(submission);

  // Attachments will now be in the format expected by the Email+PDF submission event
  return attachments;
}

// Usage Example
(async () => {
  const submission = {
    quickStreamTransaction: {
      transactionId: '1234567890',
      amount: 5000, // Amount in cents
      paymentMethod: 'Credit Card',
      paymentDate: '2024-08-16T00:00:00Z',
    },
    customerDetails: {
      name: 'John Doe',
    },
  };

  const attachments = await handleEmailPdfEvent(submission);
  console.log('Generated Attachments:', attachments);
})();
