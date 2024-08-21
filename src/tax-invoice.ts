import { generatePdfHtml } from "./templates/index.mjs";
import Boom from "@hapi/boom";
import OneBlink from '@oneblink/sdk';

import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs";
import * as Templates from "./templates/index.mjs";
import * as Logs from "./BfsLibrary/logs.mjs"
import moment from 'moment';


// Initialize the OneBlink Forms SDK
const formsSDK = new OneBlink.Forms({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
});

const pdfSDK = new OneBlink.PDF({
  accessKey: process.env.PDF_ACCESS_KEY!,
  secretKey: process.env.PDF_SECRET_KEY!,
});


// Function to generate the Tax Invoice PDF
async function generateTaxInvoice(submission, formSubmissionPayments) {

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionPayments in generateTaxInvoice:', JSON.stringify(formSubmissionPayments, null, 2));
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionPayments[0] in generateTaxInvoice:', JSON.stringify(formSubmissionPayments[0], null, 2));

  // Prepare the data for the template
  const templateData = {
    // invoiceDate: moment().format('YYYY-MM-DD'),
    receiptNumber: formSubmissionPayments[0].paymentTransaction.receiptNumber,
    paymentReference: formSubmissionPayments[0].submissionId,
    principalAmount: formSubmissionPayments[0].paymentTransaction.principalAmount.displayAmount,
    surchargeAmount: formSubmissionPayments[0].paymentTransaction.surchargeAmount.displayAmount,
    amountPaid: formSubmissionPayments[0].paymentTransaction.totalAmount.displayAmount,
    settlementDate: moment(formSubmissionPayments[0].paymentTransaction.settlementDate).format('YYYY-MM-DD'),
    customerReferenceNumber: formSubmissionPayments[0].paymentTransaction.customerReferenceNumber,
  };

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('templateData:', templateData);

  // Render the HTML using Mustache
  // const content = mustache.render(taxInvoiceTemplate, templateData);

  const pdfHtml = await Templates.generatePdfTaxInvoice(templateData);
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('pdfHtml:', pdfHtml);
  console.log("Generating custom PDF");
  const pdf = await pdfSDK.generatePDF({
    body: {
      html: pdfHtml,
    },
  });

  const emailAttachment = await formsSDK.uploadEmailAttachment({
    filename: `TaxInvoice-${templateData.receiptNumber}.pdf`,
    contentType: 'application/pdf',
    body: pdf,
  })

  const attachments =
  {
   "attachments": [
    emailAttachment
   ]
  };

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('attachments:', attachments);
  return attachments
}


// Usage Example
// (async () => {
//   const submission = {
//     quickStreamTransaction: {
//       transactionId: '1234567890',
//       amount: 5000, // Amount in cents
//       paymentMethod: 'Credit Card',
//       paymentDate: '2024-08-16T00:00:00Z',
//     },
//     customerDetails: {
//       name: 'John Doe',
//     },
//   };

//   const attachments = await handleEmailPdfEvent(submission);
//   console.log('Generated Attachments:', attachments);
// })();

export let post = async function webhook(req: OneBlinkHelpers.Request, res: object) {
  console.log("Validating webhook request payload");
  if (
    !req.body ||
    !req.body.formId ||
    !req.body.submissionId ||
    !req.body.secret
  ) {
    throw Boom.badRequest("Invalid webhook request payload", req.body);
  }

  console.log("Authorizing webhook request");
  if (req.body.secret !== process.env.CUSTOM_ATTACHMENT_CALLBACK_SECRET) {
    throw Boom.forbidden("Unauthorised", req.body);
  }

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("req", req);

  console.log("Retrieving form data for submission", {
    formId: req.body.formId,
    submissionId: req.body.submissionId,
    isDraft: req.body.isDraft,
  });

  // Fetch the submission data
  const s3SubmissionData = await formsSDK.getSubmissionData(
    req.body.formId,
    req.body.submissionId,
    req.body.isDraft
  );
  const submission  = s3SubmissionData?.submission;
  if (!submission) {
    throw new Error('Submission data not found.');
  }
  
  const { formSubmissionMeta, formSubmissionPayments } = await formsSDK.getFormSubmissionMeta(req.body.submissionId)
  if (!formSubmissionMeta) {
    throw new Error('formSubmissionMeta data not found.');
  }

  // if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionMeta:', formSubmissionMeta);
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionPayments:', JSON.stringify(formSubmissionPayments, null, 2));
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('Submission Data:', submission);

  const attachments = await generateTaxInvoice(submission, formSubmissionPayments);
  console.log("Webhook returning attachments ...", attachments);
  return attachments
};
  