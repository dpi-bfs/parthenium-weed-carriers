import Boom from "@hapi/boom"

import OneBlink from "@oneblink/sdk"
import * as OneBlinkHelpers from "./lib/oneblinkSdkHelpers.mjs";
import * as ProjectTypes from "./projectTypes.js";
import { SubmissionTypes } from "@oneblink/types";
import { FormApprovalFlowInstance } from "@oneblink/types/typescript/approvals.js";

import * as OneBlinkToMailgun  from "./localLibrary/oneBlinkToMailgun.mjs";

import * as StringTools from "./lib/stringTools.mjs";
import * as DateTimeTools from "./lib/dateTime.mjs"

import { CertificateFields, FormApprovalFlowInstanceSubset } from "./projectTypes.js";
import *  as SendPostRequest from "./lib/sendPostRequest.mjs"

import * as Base64Tools from "./localLibrary/base64Tools.mjs"

// const formsSDK = new OneBlink.Forms({
//   accessKey: process.env.FORMS_ACCESS_KEY!,
//   secretKey: process.env.FORMS_SECRET_KEY!,
// });

// const approvalsSDK = new OneBlink.Approvals({
//   accessKey: process.env.FORMS_ACCESS_KEY!,
//   secretKey: process.env.FORMS_SECRET_KEY!,
// })

// const pdfSDK = new OneBlink.PDF({
//   accessKey: process.env.PDF_ACCESS_KEY!,
//   secretKey: process.env.PDF_SECRET_KEY!,
// });


async function postToPowerAutomate(recordOfMovementAndInspection: ProjectTypes.RecordOfMovementAndInspection) {
  console.log("Posting data to power automate");
  // const data = {
  //   PowerAutomateSecretKey: process.env.POWER_AUTOMATE_SECRET_KEY,
  //   ExternalId: certificateFields.ExternalId,
  //   FoodHandlerName: certificateFields.FoodHandlerName,
  //   FoodHandlerEmail: certificateFields.FoodHandlerEmail,
  //   SubmissionId: certificateFields.SubmissionId,
  //   SubmissionUtcDateTime: req.body.submissionTimestamp,
  //   SubmissionLocalDateTime: certificateFields.SubmissionLocalDateTime,
  //   FormId: req.body.formId,
  //   Pdf: pdf.toString('base64')
  // }
  // console.log("data", data);
  const data = recordOfMovementAndInspection;

  await SendPostRequest.sendPostRequest(data, process.env.POWER_AUTOMATE_HTTP_POST_URL!);  
}

async function getFormApprovalFlowInstanceSubset(formApprovalFlowInstance: FormApprovalFlowInstance): Promise<FormApprovalFlowInstanceSubset> {
  let formApprovalFlowInstanceSubset: FormApprovalFlowInstanceSubset = { 
      InspectorEmail: "",
      InspectorName: "",
      ApprovalFlowUpdatedAt: ""
  };

  if (formApprovalFlowInstance?.lastUpdatedBy) {
    formApprovalFlowInstanceSubset.InspectorEmail = formApprovalFlowInstance?.lastUpdatedBy;
    formApprovalFlowInstanceSubset.InspectorName = StringTools.parseEmailToName(formApprovalFlowInstanceSubset.InspectorEmail);
    formApprovalFlowInstanceSubset.ApprovalFlowUpdatedAt = formApprovalFlowInstance.updatedAt
  } else {
    throw Boom.badData(`approvalFormId (${formApprovalFlowInstance?.lastUpdatedBy}) is undefined (so biosecurityCertifier can't be derived).`)
  }

  return formApprovalFlowInstanceSubset;
} 

interface Response {
  setStatusCode(code: number): void;
  setHeader(name: string, value: string): void;
  setPayload(payload: { [key: string]: any }): void;
}

export let post = async function webhook(req: OneBlinkHelpers.Request, res: Response) {
  OneBlinkHelpers.validateWebhook(req);

  console.log("req", req);
  
  // The first form in the process.
  // let baseFormSubmission: SubmissionTypes.S3SubmissionData 
  //   & { baseFormSubmissionId?: string } 
  // = await OneBlinkHelpers.getBaseFormSubmission(req.body.formId, req.body.submissionId, req.body.isDraft);
  let baseFormSubmission: ProjectTypes.BaseFormSubmissionProjectSpecific 
  = await OneBlinkHelpers.getBaseFormSubmission(req.body.formId, 
      req.body.submissionId, 
      req.body.isDraft) as ProjectTypes.BaseFormSubmissionProjectSpecific;
                                                  
  const baseFormSubmissionId = req.body.submissionId;
  // console.log('baseFormSubmissionId', baseFormSubmissionId)

  baseFormSubmission.BaseFormSubmissionId = baseFormSubmissionId
  console.log('baseFormSubmission *** 111 ***', baseFormSubmission)
  
const { 
  approvalFormSubmission, // The form data the approval's user sees and generally manipulates
  formApprovalFlowInstance,  // Data about the flow process itself.
  approvalFormSubmissionId
}: ProjectTypes.ApprovalFormDataProjectSpecific = await OneBlinkHelpers.getApprovalFormData(req) as ProjectTypes.ApprovalFormDataProjectSpecific

  approvalFormSubmission.ApprovalFormSubmissionId = approvalFormSubmissionId 
  console.log('approvalFormSubmission *** 222 ***', approvalFormSubmission)

  console.log('formApprovalFlowInstance', formApprovalFlowInstance)
  // console.log('approvalFormSubmissionId', approvalFormSubmissionId)
  
  const formApprovalFlowInstanceSubset: FormApprovalFlowInstanceSubset = await getFormApprovalFlowInstanceSubset(formApprovalFlowInstance)
  console.log('formApprovalFlowInstanceSubset *** 333 ***', formApprovalFlowInstanceSubset)

  // Add recordOfMovementAndInspection.BiosecurityCertificatePdf below.
  const extraData: ProjectTypes.ExtraData = {
    EnvPrefix: process.env.ENV_PREFIX ?? '',
    PowerAutomateSecretKey: process.env.POWER_AUTOMATE_SECRET_KEY ?? '',
    BiosecurityCertificatePdf: ""
  }

  const recordOfMovementAndInspection: ProjectTypes.RecordOfMovementAndInspection = {
    ...baseFormSubmission,
    ...approvalFormSubmission,
    ...formApprovalFlowInstanceSubset,
    ...extraData
  }

  // This was, at the point of approval form load, a calculated field.
  // We already have PersonResponsibleFirstName and PersonResponsibleLastName on the base form
  // to send through to the database.
  // The certificate does not show the person responsible at all.
  // delete recordOfMovementAndInspection.PersonResponsibleName;
  
  // The value that comes through is "env" rather than "DEV -", "TEST -", etc. 
  // So we use a different environment variable
  delete recordOfMovementAndInspection.env;

  console.log(`recordOfMovementAndInspection is created from the union of:
          baseFormSubmission, 
          approvalFormSubmission and 
          formApprovalFlowInstanceSubset`);

  // recordOfMovementAndInspection might have deeply nested objects. E.g. Coming from NSW point.
  // JSON.stringify(x, null, 2) ensures this is displayed properly    
  console.log('recordOfMovementAndInspection *** 444 ***', JSON.stringify(recordOfMovementAndInspection, null, 2));

  // const qrCodeImage: string = await Base64Tools.getImageAsBase64(`https://api.qrserver.com/v1/create-qr-code/?data=https://nswfoodauthority-dpi-forms-dev.cdn.oneblink.io/forms/19556?preFillData={%22PaperCertificateNumber%22:%22${recordOfMovementAndInspection.PaperCertificateNumber}%22}&format=svg`)
  const qrCodeImage: string = await Base64Tools.getImageAsBase64(`https://api.qrserver.com/v1/create-qr-code/?data=${process.env.BIOSECURITY_CERTIFICATE_LOOKUP_FORM}?preFillData={%22PaperCertificateNumber%22:%22${recordOfMovementAndInspection.PaperCertificateNumber}%22}&format=svg`)

  console.log("recordOfMovementAndInspection.InspectionDate",recordOfMovementAndInspection.InspectionDate);
  console.log("recordOfMovementAndInspection.CertificateInForceForDays", recordOfMovementAndInspection.CertificateInForceForDays);
  const certificateInForceExpiryDateTimeLocalIso = DateTimeTools.addDaysToIsoDate(recordOfMovementAndInspection.InspectionDate, recordOfMovementAndInspection.CertificateInForceForDays);
  console.log("certificateInForceExpiryDateTimeLocalIso",certificateInForceExpiryDateTimeLocalIso);
  const certificateInForceExpiryDateTimeCustom = DateTimeTools.formatDateCustom(certificateInForceExpiryDateTimeLocalIso, 'Australia/Sydney');
  console.log("certificateInForceExpiryDateTimeCustom", certificateInForceExpiryDateTimeCustom);

  let certificateFields: CertificateFields = {
    PaperCertificateNumber: recordOfMovementAndInspection.PaperCertificateNumber,
    InspectorName: recordOfMovementAndInspection.InspectorName,
    Carriers: recordOfMovementAndInspection.Carriers,
    CertificateInForceForDays: recordOfMovementAndInspection.CertificateInForceForDays,
    CertificateInForceExpiryDateTime: certificateInForceExpiryDateTimeCustom,
    InspectionDate: DateTimeTools.getDatePartAsIfLocal(recordOfMovementAndInspection.InspectionDate),
    InspectorRole: "Regulatory Officer",
    InspectorAgency: "NSW DPI",
    ApprovalFlowUpdatedAt: DateTimeTools.formatDateCustom(recordOfMovementAndInspection.ApprovalFlowUpdatedAt, 'Australia/Sydney'),
    PersonResponsibleName: `${recordOfMovementAndInspection.PersonResponsibleFirstName} ${recordOfMovementAndInspection.PersonResponsibleLastName}`,
    PersonResponsibleEmail: recordOfMovementAndInspection.PersonResponsibleEmail, 
    DigitalReferenceCode: recordOfMovementAndInspection.trackingCode,
    BaseFormSubmissionId: recordOfMovementAndInspection.BaseFormSubmissionId,
    ApprovalFormSubmissionId: recordOfMovementAndInspection.ApprovalFormSubmissionId,
    EnvPrefix: recordOfMovementAndInspection.EnvPrefix,
    QRCodeImage: qrCodeImage
  }
  
  console.log("certificateFields is an object that stores the fields for the certificate only. They aren't directly passed on to the database. What gets passed on is recordOfMovementAndInspection")
  console.log("certificateFields", certificateFields);

  if (recordOfMovementAndInspection.InspectionResult.startsWith("Passed")) {
    recordOfMovementAndInspection.BiosecurityCertificatePdf = await OneBlinkToMailgun.sendMail(certificateFields, recordOfMovementAndInspection.InspectorEmail);
  }

  await postToPowerAutomate(recordOfMovementAndInspection);
  
  res.setStatusCode(200);
  res.setHeader('content-type', 'application/json');
  res.setPayload({
    message: req.url.pathname + " completed."
  })
  console.log("res set", res);

  console.log("Webhook completed successfully");
};
