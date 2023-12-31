import Boom from "@hapi/boom"

import * as OneBlinkHelpers from "./lib/oneblinkSdkHelpers.mjs";
import * as ProjectTypes from "./projectTypes.js";
import { FormApprovalFlowInstance } from "@oneblink/types/typescript/approvals.js";

import * as OneBlinkToMailgun  from "./localLibrary/oneBlinkToMailgun.mjs";

import * as StringTools from "./lib/stringTools.mjs";
import * as DateTimeTools from "./lib/dateTime.mjs"

import { CertificateFields, FormApprovalFlowInstanceSubset } from "./projectTypes.js";
import *  as SendPostRequest from "./lib/sendPostRequest.mjs"

import * as Base64Tools from "./localLibrary/base64Tools.mjs"
import * as Logs from "./lib/logs.mjs"

async function postToPowerAutomate(recordOfMovementAndInspection: ProjectTypes.RecordOfMovementAndInspection) {
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("Posting data to power automate");
  // const data = {
  //   PowerAuto  mateSecretKey: process.env.POWER_AUTOMATE_SECRET_KEY,
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

  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("base-form-approval-event start");
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("req", req);
  

  let baseFormSubmission: ProjectTypes.BaseFormSubmissionProjectSpecific 
  = await OneBlinkHelpers.getBaseFormSubmission(req.body.formId, 
      req.body.submissionId, 
      req.body.isDraft) as ProjectTypes.BaseFormSubmissionProjectSpecific;
                                                  
  const baseFormSubmissionId = req.body.submissionId;
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log('baseFormSubmissionId', baseFormSubmissionId)

  baseFormSubmission.BaseFormSubmissionId = baseFormSubmissionId
  baseFormSubmission.BaseFormSubmissionTimestamp = req.body.submissionTimestamp
  baseFormSubmission.BaseFormId = req.body.formId
  if (Logs.LogLevel <= Logs.LogLevelEnum.privacyExposing) console.log('baseFormSubmission *** 111 ***', baseFormSubmission)
  
const { 
  approvalFormSubmission, // The form data the approval's user sees and generally manipulates
  formApprovalFlowInstance,  // Data about the flow process itself.
  approvalFormSubmissionId,
  approvalFormId
}: ProjectTypes.ApprovalFormDataProjectSpecific = await OneBlinkHelpers.getApprovalFormData(req) as ProjectTypes.ApprovalFormDataProjectSpecific

  approvalFormSubmission.ApprovalFormSubmissionId = approvalFormSubmissionId 
  approvalFormSubmission.ApprovalFormId = approvalFormId
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log('approvalFormSubmission *** 222 ***', approvalFormSubmission)

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formApprovalFlowInstance', formApprovalFlowInstance)
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('approvalFormSubmissionId', approvalFormSubmissionId)
  
  const formApprovalFlowInstanceSubset: FormApprovalFlowInstanceSubset = await getFormApprovalFlowInstanceSubset(formApprovalFlowInstance)
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('formApprovalFlowInstanceSubset *** 333 ***', formApprovalFlowInstanceSubset)

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
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log('recordOfMovementAndInspection *** 444 ***', JSON.stringify(recordOfMovementAndInspection, null, 2));

  // const qrCodeImage: string = await Base64Tools.getImageAsBase64(`https://api.qrserver.com/v1/create-qr-code/?data=https://nswfoodauthority-dpi-forms-dev.cdn.oneblink.io/forms/19556?preFillData={%22PaperCertificateNumber%22:%22${recordOfMovementAndInspection.PaperCertificateNumber}%22}&format=svg`)
  const qrCodeImage: string = await Base64Tools.getImageAsBase64(`https://api.qrserver.com/v1/create-qr-code/?data=${process.env.BIOSECURITY_CERTIFICATE_LOOKUP_FORM}?preFillData={%22PaperCertificateNumber%22:%22${recordOfMovementAndInspection.PaperCertificateNumber}%22}&format=svg`)

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("recordOfMovementAndInspection.InspectionDate",recordOfMovementAndInspection.InspectionDate);
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("recordOfMovementAndInspection.CertificateInForceForDays", recordOfMovementAndInspection.CertificateInForceForDays);
  const certificateInForceExpiryDateTimeLocalIso = DateTimeTools.addDaysToIsoDate(recordOfMovementAndInspection.InspectionDate, recordOfMovementAndInspection.CertificateInForceForDays);
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("certificateInForceExpiryDateTimeLocalIso",certificateInForceExpiryDateTimeLocalIso);
  const certificateInForceExpiryDateTimeCustom = DateTimeTools.formatDateCustom(certificateInForceExpiryDateTimeLocalIso, 'Australia/Sydney');
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("certificateInForceExpiryDateTimeCustom", certificateInForceExpiryDateTimeCustom);

  const ApprovalFlowUpdatedAtLocal = DateTimeTools.formatDateCustom(recordOfMovementAndInspection.ApprovalFlowUpdatedAt, 'Australia/Sydney')
  if (recordOfMovementAndInspection.InspectionResult.startsWith("Passed")) {
    let certificateFields: CertificateFields = {
      InspectionDate: DateTimeTools.getDatePartAsIfLocal(recordOfMovementAndInspection.InspectionDate),
      CertificateInForceForDays: recordOfMovementAndInspection.CertificateInForceForDays,
      PaperCertificateNumber: recordOfMovementAndInspection.PaperCertificateNumber,
      InspectorName: recordOfMovementAndInspection.InspectorName,
      Carriers: recordOfMovementAndInspection.Carriers,
      CertificateInForceExpiryDateTime: certificateInForceExpiryDateTimeCustom,
      InspectorRole: "Regulatory Officer",
      InspectorAgency: "NSW DPI",
      ApprovalFlowUpdatedAt: ApprovalFlowUpdatedAtLocal,
      PersonResponsibleName: `${recordOfMovementAndInspection.PersonResponsibleFirstName} ${recordOfMovementAndInspection.PersonResponsibleLastName}`,
      PersonResponsibleEmail: recordOfMovementAndInspection.PersonResponsibleEmail, 
      DigitalReferenceCode: recordOfMovementAndInspection.trackingCode,
      BaseFormSubmissionId: recordOfMovementAndInspection.BaseFormSubmissionId,
      ApprovalFormSubmissionId: recordOfMovementAndInspection.ApprovalFormSubmissionId,
      EnvPrefix: recordOfMovementAndInspection.EnvPrefix,
      QRCodeImage: qrCodeImage
    }   

    if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("certificateFields is an object that stores the fields for the certificate only. They aren't directly passed on to the database. What gets passed on is recordOfMovementAndInspection")
    if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("certificateFields", certificateFields);

    recordOfMovementAndInspection.BiosecurityCertificatePdf = await OneBlinkToMailgun.sendMail(certificateFields, recordOfMovementAndInspection.InspectorEmail);
  }

  if (Logs.LogLevel <= Logs.LogLevelEnum.error) {
    console.log("******* ID Block Start ********")
    console.log("trackingCode", recordOfMovementAndInspection.trackingCode)
    console.log("BaseFormSubmissionId", recordOfMovementAndInspection.BaseFormSubmissionId)
    console.log("BaseFormSubmissionTimestamp", recordOfMovementAndInspection.BaseFormSubmissionTimestamp)
    console.log("ApprovalFormSubmissionId", recordOfMovementAndInspection.ApprovalFormSubmissionId)
    console.log("ApprovalFlowUpdatedAt", ApprovalFlowUpdatedAtLocal)
    console.log("Person Responsible ", recordOfMovementAndInspection.PersonResponsibleFirstName + " " + recordOfMovementAndInspection.PersonResponsibleLastName)
    console.log("InspectorName", recordOfMovementAndInspection.InspectorName)
    console.log("InspectionFacility", recordOfMovementAndInspection.InspectionFacility)
    console.log("******* ID Block End   ********")
  }

  await postToPowerAutomate(recordOfMovementAndInspection);
  
  res.setStatusCode(200);
  res.setHeader('content-type', 'application/json');
  res.setPayload({
    message: req.url.pathname + " completed."
  })
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("res set", res);

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("Webhook completed successfully");
};
