import { setTaxInvoiceToFields } from "./localLibrary/set-tax-invoice-to-fields.js";
import Boom from "@hapi/boom";
import OneBlink from '@oneblink/sdk';
import OneBlinkTypes from '@oneblink/types'

import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs";
import * as Templates from "./templates/index.mjs";
import * as Logs from "./BfsLibrary/logs.mjs"
import Moment from 'moment-timezone';
// import * as DateFns from 'date-fns';

import { primaryNswGovernmentLogo } from "./templates/images.mjs"


// Initialize the OneBlink Forms SDK
const formsSDK = new OneBlink.Forms({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
});

const pdfSDK = new OneBlink.PDF({
  accessKey: process.env.PDF_ACCESS_KEY!,
  secretKey: process.env.PDF_SECRET_KEY!,
});


// Function to generate the Tax Invoice PDF, as Buffer (not Base64)
export async function getTaxInvoicePdf(
      submission, 
      formSubmissionPayments, 
      formSubmissionMeta: OneBlinkTypes.SubmissionTypes.FormSubmissionMeta
    ): Promise<Buffer> {

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionPayments in generateTaxInvoice:', JSON.stringify(formSubmissionPayments, null, 2));
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionPayments[0] in generateTaxInvoice:', JSON.stringify(formSubmissionPayments[0], null, 2));

  // If a card is declined (e.g. with 05 - Do not honour) then a successful payment is given E.g. "08 - Honour with identification" or (in PROD "00"),
  // Then the successful payment will be the last object in the formSubmissionPayments array.
  const formSubmissionPayment = formSubmissionPayments[formSubmissionPayments.length - 1];

  // This should never occur as when a user on a form's westpac payments card dialog either cancels or provides a dishonoured card,
  // the payment will cancel back to the form (although there'll be a submission event in the console)
  // When card good PROD returns: 00 - Approved or completed successfully; Non-PROD returns:  08 - Honour with Identification
  // https://quickstream.westpac.com.au/docs/general/response-codes/
  if (formSubmissionPayment.status !== "SUCCEEDED"
    && !(formSubmissionPayment.paymentTransaction.responseCode == "00" || 
         formSubmissionPayment.paymentTransaction.responseCode == "08")
    ) {
    throw Boom.badData('Payment not SUCCEEDED with response code "00" or "08". Was '
        + `status: ${formSubmissionPayment.status}; `
        + `formSubmissionPayment.paymentTransaction.responseCode: ${formSubmissionPayment.paymentTransaction.responseCode}; `
        + `formSubmissionPayment.paymentTransaction.responseDescription: ${formSubmissionPayment.paymentTransaction.responseDescription}`);
  }
 
  const { ToFirstName, ToLastName,  ToBusinessName, ToAbn } = setTaxInvoiceToFields(submission)

  // new Date("2024-08-27T10:12:03+1000") => 2024-08-27 10:12:03 +10:00
  const transactionDateTimeFormatted = Moment.tz(formSubmissionPayment.paymentTransaction.transactionTime, 'Australia/Sydney').format('DD/MM/YYYY h:mm a (z)');

  console.log("formSubmissionPayment.paymentTransaction.transactionTime: ", formSubmissionPayment.paymentTransaction.transactionTime);
  console.log("transactionDateTimeFormatted", transactionDateTimeFormatted);

  // Prepare the data for the template
  const taxInvoiceData = {
    // html. Requires triple braces `{{{}}}` in mustache file
    logo: primaryNswGovernmentLogo,

    // seller
    sellerEntityName: "NSW Department of Primary Industries and Regional Development",
    sellerAbn:"ABN: 19 948 325 463",
    sellerStreetAddress: "Locked Bag 21",
    sellerSuburb: "Orange",
    sellerState: "NSW",
    sellerPostcode: "2800",
    sellerPhone: "(02) 6391 3100",

    // to
    toFirstName: ToFirstName,
    toLastName: ToLastName,
    toBusinessName: ToBusinessName,
    toAbn: ToAbn,

    // Description
    paperCertificateNumber: submission.PaperCertificateNumber,

    // technical
    formName: formSubmissionMeta.formName,
    formId: formSubmissionMeta.formId,
    apiEnvironment: process.env.ONEBLINK_ENVIRONMENT,
    formDigitalReferenceCode: submission.trackingCode,
    formSubmissionId: formSubmissionMeta.submissionId,
    formDateTimeSubmitted: formSubmissionMeta.dateTimeSubmitted,

    // paymentTransactionDetails
    // paymentReferenceNumber: formSubmissionPayment.paymentTransaction.paymentReferenceNumber,
    receiptNumber: formSubmissionPayment?.paymentTransaction?.receiptNumber,
    cardholderName: formSubmissionPayment.paymentTransaction.creditCard.cardholderName,
    cardNumberLast4digits: formSubmissionPayment.paymentTransaction.creditCard.maskedCardNumber4Digits.slice(-4),
    transactionTime: transactionDateTimeFormatted,
    principalAmount: formSubmissionPayment.paymentTransaction.principalAmount.displayAmount,
    surchargeAmount: formSubmissionPayment.paymentTransaction.surchargeAmount.displayAmount,
    amountPaid: formSubmissionPayment.paymentTransaction.totalAmount.displayAmount,
  };

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('taxInvoiceData:', taxInvoiceData);


  const pdfHtml = await Templates.generatePdfHtmlTaxInvoice(taxInvoiceData);
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('pdfHtml:', pdfHtml);
  console.log("Generating custom PDF");
  const pdf = await pdfSDK.generatePDF({
    body: {
      html: pdfHtml,
    },
  });

  return pdf
}

async function getTaxInvoiceAsEmailAttachment(pdf: Buffer, digitalReferenceCode: string, receiptNumber: string){
  const emailAttachment = await formsSDK.uploadEmailAttachment({
    filename: `TaxInvoice-${digitalReferenceCode}-${receiptNumber}.pdf`,
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
    throw Boom.forbidden("Unauthorised. Wrong Secret: OneBlink Email+PDF event > Include custom attachment > Secret", req.body);
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

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionMeta:', formSubmissionMeta);
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionPayments:', JSON.stringify(formSubmissionPayments, null, 2));
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('Submission Data:', JSON.stringify(submission, null, 2));

  if (formSubmissionPayments) {
    const pdf = await getTaxInvoicePdf(submission, formSubmissionPayments, formSubmissionMeta);
    const attachments = await getTaxInvoiceAsEmailAttachment(pdf, submission.trackingCode, formSubmissionPayments[0]?.paymentTransaction?.receiptNumber);
    console.log("Webhook returning attachments ...", attachments);
    return attachments
  } else {
    console.log("Webhook: No payments made, therefore no tax invoice to return.");
    return {
      "attachments": [] 
    }
  }

};
  