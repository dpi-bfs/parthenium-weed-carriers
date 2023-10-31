// Updated: 2023-09-18 14:37

"use strict";

import Boom from "@hapi/boom"

import OneBlink from "@oneblink/sdk"

import * as MailGun from "../src/library/mailgunWrapper.mjs";
import * as Tools from "../src/library/tools.mjs";

import { generatePdfHtml, generateEmailHtml } from "../src/templates/index.mjs";

import *  as SendPostRequest from "../src/library/sendPostRequest.mjs"
import { SubmissionTypes } from "@oneblink/types";

const formsSDK = new OneBlink.Forms({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
});

const approvalsSDK = new OneBlink.Approvals({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
})

const pdfSDK = new OneBlink.PDF({
  accessKey: process.env.PDF_ACCESS_KEY!,
  secretKey: process.env.PDF_SECRET_KEY!,
});



interface Request {
  body: {
    formId: number,
    submissionId: string,
    isDraft: boolean,
    submissionTimestamp: string,
    externalId: string,
    secret: string,
  }
}

export let post = async function webhook(req: Request, res: object) {
  console.log("In approval-form-submission-event");
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
  if (req.body.secret !== process.env.WEB_HOOK_SECRET) {
    throw Boom.forbidden("Unauthorised", req.body);
  }

  // console.log("req", req);

  console.log("Retrieving form data for submission", {
    formId: req.body.formId,
    submissionId: req.body.submissionId,
    isDraft: req.body.isDraft,
  });

  const { submission }  = await formsSDK.getSubmissionData(
    req.body.formId,
    req.body.submissionId,
    req.body.isDraft
  );

  console.log("submission", submission);

  // const formSubmissionApproval = await approvalsSDK.getFormSubmissionApproval(
  //   req.body.submissionId
  // );
  // console.log("formSubmissionApproval", formSubmissionApproval);

  const {
    formSubmissionMeta,
    formApprovalFlowInstance,
    formSubmissionApprovals,
    formSubmissionPayments,
  } = await formsSDK.getFormSubmissionMeta(req.body.submissionId);

  console.log("formSubmissionMeta", formSubmissionMeta) // Has submissionTite
  console.log("formApprovalFlowInstance", formApprovalFlowInstance) // The one we want
  console.log("formSubmissionApprovals", formSubmissionApprovals)
  
  const approvalStatus = formSubmissionApprovals[0].status
  const approvalFormSubmissionId = formSubmissionApprovals[0].approvalFormSubmissionId
  const approvalFormId = formSubmissionApprovals[0].approvalFormId
  const approvalId = formSubmissionApprovals[0].id
  console.log("approvalStatus", approvalStatus);
  console.log("approvalFormSubmissionId", approvalFormSubmissionId);
  console.log("approvalFormId", approvalFormId);
  console.log("approvalId", approvalId);

  var approvalFormSubmissionData 
  if (req.body.formId && req.body.submissionId) {
    ({ approvalFormSubmissionData } = await formsSDK.getSubmissionData(
      req.body.formId,
      req.body.submissionId,
      false
    ));
    console.log("approvalFormSubmissionData", approvalFormSubmissionData);
  } else {
    throw Boom.badData(`approvalFormId (${approvalFormId}) or approvalFormSubmissionId (${approvalFormSubmissionId}) is undefined`)
  }
  console.log("approvalFormSubmissionData", approvalFormSubmissionData);

  let formSubmissionApproval 
  if (approvalId) {
    formSubmissionApproval =
    await approvalsSDK.getFormSubmissionApproval(
      approvalId,
    )
  } else {
    throw Boom.badData(`approvalId (${approvalId}) is undefined`)
  }
  console.log("approvalSubmission", formSubmissionApproval);


  formSubmissionApproval = await approvalsSDK.getFormApprovalFlowInstance(formApprovalFlowInstance)

  interface Carrier {
    CarrierType: string,
    CarrierMake: string,
    CarrierModel: string,
    CarrierRegistrationNumber: string,
    CarrierSerialNumber: string
  }

  interface CertificateFields {
    BiosecurityCertifier: string,
    PersonResponsibleFirstName: string,
    PersonResponsibleLastName: string, 
    PersonResponsibleEmail: string,
    Carrier: Carrier[],
    ExternalId: string,
    SubmissionId: string,
    SubmissionLocalDateTime: string,
    EnvPrefix: string,
    [name: string]: unknown;
  }

  let certificateFields: CertificateFields = submission as CertificateFields;

  // // We generate the tracking code here as when a form is embedded a OneBlink 6 char
  // // Tracking code is not returned. We use 8 chars to signal this is not a OneBlink generated char.
  // // submission.externalId = Tools.generateTrackingCode(8);
  console.log("certificateFields 01", certificateFields);
  certificateFields.BiosecurityCertifier = "BiosecurityCertifier todo"
  certificateFields.ExternalId = req.body.externalId;
  certificateFields.SubmissionId = req.body.submissionId;
  certificateFields.SubmissionLocalDateTime = Tools.getCustomLocalDateTime(req.body.submissionTimestamp);
  certificateFields.EnvPrefix = process.env.ENV_PREFIX ?? '';
  console.log("certificateFields 02", certificateFields);

  const SENDER_EMAIL_ADDRESS = process.env.SENDER_EMAIL_ADDRESS;

  console.log("PersonResponsibleEmail", certificateFields.PersonResponsibleEmail);
  const RECIPIENT_EMAIL_ADDRESS = certificateFields.PersonResponsibleEmail;

  console.log("Generating HTML template for email");
  const emailHtml = await generateEmailHtml(certificateFields);
  console.log("emailHtml", emailHtml);

  console.log("Generating HTML template for custom PDF");
  const pdfHtml = await generatePdfHtml(certificateFields);
  // console.log("pdfHtml", pdfHtml);

  console.log("Generating custom PDF");
  const pdf = await pdfSDK.generatePDF({
    body: {
      html: pdfHtml,
    },
  });

  console.log("Sending email");

  const emailProps: MailGun.Props = {
    to: RECIPIENT_EMAIL_ADDRESS,
    from: SENDER_EMAIL_ADDRESS, 
    subject: `${certificateFields.EnvPrefix}Parthenium Weed Carrier - Biosecurity Certificate - ${certificateFields.ExternalId}`,
    html: emailHtml,
    attachments: [ {
      data: pdf,
      filename: `PartheniumWeedCarrier-BiosecurityCertificate-${certificateFields.ExternalId}.pdf`
    }]
  }

  const oneblinkEnvironment = process.env.ONEBLINK_ENVIRONMENT!
  console.log("oneblinkEnvironment", oneblinkEnvironment);
  
  const mailgunOptions = {
    testmode: false,
    internalEmail: false
  }
  await MailGun.sendEmail(emailProps, oneblinkEnvironment, mailgunOptions);
  console.log("Sent mail via MailGun")

  // console.log("Posting data to power automate");
  // // const data: SendPostRequest.PostData  = {
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

  // // FoodHandlerBasicsCertificate-DefaultEnv
  // await SendPostRequest.sendPostRequest(data, process.env.POWER_AUTOMATE_HTTP_POST_URL!);  

  console.log("Webhook completed successfully: approval-form-submission-event");
};
