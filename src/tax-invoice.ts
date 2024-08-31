import { generatePdfHtml } from "./templates/index.mjs";
import Boom from "@hapi/boom";
import OneBlink from '@oneblink/sdk';
import OneBlinkTypes from '@oneblink/types'

import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs";
import * as Templates from "./templates/index.mjs";
import * as Logs from "./BfsLibrary/logs.mjs"
import Moment from 'moment';
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


// Function to generate the Tax Invoice PDF
async function generateTaxInvoice(
      submission, 
      formSubmissionPayments, 
      formSubmissionMeta: OneBlinkTypes.SubmissionTypes.FormSubmissionMeta
    ) {

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionPayments in generateTaxInvoice:', JSON.stringify(formSubmissionPayments, null, 2));
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formSubmissionPayments[0] in generateTaxInvoice:', JSON.stringify(formSubmissionPayments[0], null, 2));

  const formSubmissionPayment = formSubmissionPayments[0]

  // This should never occur as when a user on a form's westpac payments card dialog either cancels or provides a dishonoured card,
  // the payment will cancel back to the form (although there'll be a submission event in the console)
  if (formSubmissionPayment.status !== "SUCCEEDED" 
    || formSubmissionPayment.paymentTransaction.responseCode !== "08" 
    || formSubmissionPayment.paymentTransaction.responseDescription !== "Honour with identification") {
      
    throw Boom.badData('Payment not SUCCEEDED, 08, Honour with identification. Was '
      + `status: ${formSubmissionPayment.status}`
      + `formSubmissionPayment.paymentTransaction.responseCode: ${formSubmissionPayment.paymentTransaction.responseCode}`
      + `formSubmissionPayment.paymentTransaction.responseDescription: ${formSubmissionPayment.paymentTransaction.responseDescription}`)
  }

  // to
  let toFirstName
  let toLastName
  let toAbn

  if (submission.TaxInvoiceTo.includes("Person responsible")) {
    toFirstName = submission.PersonResponsibleFirstName
    toLastName = submission.PersonResponsibleLastName
    toAbn = submission.PersonResponsibleAbn

  } else if (submission.TaxInvoiceTo.includes("Owner")) {

    if (submission.Owner?.includes("Another person")) {
      toFirstName = submission.PersonResponsibleFirstName
      toLastName = submission.PersonResponsibleLastName
      
    } else if (submission.OwnerFirstName){
      toFirstName = submission.OwnerFirstName
      toLastName = submission.OwnerLastName

    } else {
      throw Boom.badRequest('Unexpected TaxInvoiceTo and Owner V Responsible Person combination:' +
           ` TaxInvoiceTo: ${submission.TaxInvoiceTo};` +
           ` Owner: ${submission.Owner};` +
           ` PersonResponsibleFirstName: ${submission.PersonResponsibleFirstName};` +
           ` OwnerFirstName: ${submission.OwnerFirstName};`
          );
    }

    toAbn = submission.OwnerAbn

  } else {
    throw Boom.badRequest("Unexpected TaxInvoiceTo: ", submission.TaxInvoiceTo);
  }

  let formatAbnWithSpaces 
  let toBusinessName
  if (toAbn) {
    formatAbnWithSpaces = "ABN: " + new Intl.NumberFormat('en-AU').format(toAbn.ABN.identifierValue).replace(/,/g, ' ');
    toBusinessName = toAbn.mainName.organisationName
  }

  // new Date("2024-08-27T10:12:03+1000") => 2024-08-27 10:12:03 +10:00
  const transactionTimeLocalWithOffset = Moment.parseZone(formSubmissionPayment.paymentTransaction.transactionTime).format("YYYY-MM-DD HH:mm Z");

  console.log("formSubmissionPayment.paymentTransaction.transactionTime: ", formSubmissionPayment.paymentTransaction.transactionTime);
  console.log("transactionTimeLocalWithOffset", transactionTimeLocalWithOffset);

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
    toFirstName: toFirstName,
    toLastName: toLastName,
    toBusinessName: toBusinessName,
    toAbn: formatAbnWithSpaces,

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
    transactionTime: transactionTimeLocalWithOffset,
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

  const emailAttachment = await formsSDK.uploadEmailAttachment({
    filename: `TaxInvoice-${taxInvoiceData.formDigitalReferenceCode}-${taxInvoiceData.receiptNumber}.pdf`,
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
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('Submission Data:', submission);

  const attachments = await generateTaxInvoice(submission, formSubmissionPayments, formSubmissionMeta);
  console.log("Webhook returning attachments ...", attachments);
  return attachments
};
  