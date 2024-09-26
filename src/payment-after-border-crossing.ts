import Boom from "@hapi/boom";

import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs";
import * as Logs from "./BfsLibrary/logs.mjs";
import * as ProjectTypes from "./projectTypes.js";
import { setTaxInvoiceToFields } from "./localLibrary/set-tax-invoice-to-fields.js";

import { getPaymentDataToDatabase } from './localLibrary/getPaymentDataToDatabase.js'

import * as TaxInvoice from "./tax-invoice.js"

import *  as SendPostRequest from "./BfsLibrary/sendPostRequest.mjs"

interface Response {
  setStatusCode(code: number): void;
  setHeader(name: string, value: string): void;
  setPayload(payload: { [key: string]: any }): void;
}

function validateWebhook(req: Request) {
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
}

async function postToPowerAutomate(dataObjectToSend) {
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("Posting data to power automate  (dataObjectToSend)", dataObjectToSend);
  const data = dataObjectToSend;

  await SendPostRequest.sendPostRequest(data, process.env.POWER_AUTOMATE_PAY_AFTER_URL!);  
}

export let post = async function webhook(req: OneBlinkHelpers.Request, res: Response) {

  validateWebhook(req);

  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("payment-after-border-crossing start");
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("req", req);

  // ***  baseFormSubmission
  let baseFormSubmission: ProjectTypes.BaseFormSubmissionProjectSpecific 
    = await OneBlinkHelpers.getBaseFormSubmission(req.body.formId, 
        req.body.submissionId, 
        req.body.isDraft)

  const baseFormSubmissionId = req.body.submissionId;
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log('baseFormSubmissionId', baseFormSubmissionId)

  baseFormSubmission.BaseFormSubmissionId = baseFormSubmissionId
  baseFormSubmission.BaseFormSubmissionTimestamp = req.body.submissionTimestamp
  baseFormSubmission.BaseFormId = req.body.formId        


  // ** extraData
  const extraData: ProjectTypes.ExtraData = {
    EnvPrefix: process.env.ENV_PREFIX ?? '',
    PowerAutomateSecretKey: process.env.POWER_AUTOMATE_SECRET_KEY ?? '',
    BiosecurityCertificatePdf: "",
    TaxInvoicePdf: ""
  }

  let paymentAfterBorderCrossingDataPlus = { 
    ...baseFormSubmission, 
    ...extraData
  }


  // ** payment Data
  const { formSubmissionMeta, formSubmissionPayments } = await OneBlinkHelpers.formsSDK.getFormSubmissionMeta(req.body.submissionId)

  let formSubmissionPayment;
  let ToFirstName;
  let ToLastName;
  let ToPhone;
  let ToEmail;
  let ToBusinessName;
  let ToAbn; 

  if (formSubmissionPayments && formSubmissionPayments[0]) {
    formSubmissionPayment = formSubmissionPayments[0];
    ({ ToFirstName, ToLastName, ToPhone, ToEmail, ToBusinessName, ToAbn } = setTaxInvoiceToFields(baseFormSubmission))

    paymentAfterBorderCrossingDataPlus = { ...paymentAfterBorderCrossingDataPlus,  ...getPaymentDataToDatabase(baseFormSubmission, formSubmissionPayment, ToFirstName, ToLastName, ToPhone, ToEmail, ToBusinessName, ToAbn)};
    const pdfBuffer = await TaxInvoice.getTaxInvoicePdf(baseFormSubmission, formSubmissionPayments, formSubmissionMeta)
    paymentAfterBorderCrossingDataPlus.TaxInvoicePdf = pdfBuffer.toString('base64');
  }

  await postToPowerAutomate(paymentAfterBorderCrossingDataPlus);
  
  res.setStatusCode(200);
  res.setHeader('content-type', 'application/json');
  res.setPayload({
    message: req.url.pathname + " completed."
  })
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("res set", res);

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("Webhook completed successfully");

}