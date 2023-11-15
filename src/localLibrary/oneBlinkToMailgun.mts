import OneBlink from "@oneblink/sdk"
import * as MailGun from "../lib/mailgunWrapper.mjs";

import * as Logs from "../lib/logs.mjs"

import { CertificateFields, FormApprovalFlowInstanceSubset } from "../projectTypes.js";
import { generatePdfHtml, generateEmailUserHtml, generateEmailBusinessHtml } from "../templates/index.mjs";

const pdfSDK = new OneBlink.PDF({
  accessKey: process.env.PDF_ACCESS_KEY!,
  secretKey: process.env.PDF_SECRET_KEY!,
});

export async function sendMail(certificateFields: CertificateFields, businessEmail: string): Promise<string>{

  const SENDER_EMAIL_ADDRESS = process.env.SENDER_EMAIL_ADDRESS;

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("PersonResponsibleEmail", certificateFields.PersonResponsibleEmail);
  const RECIPIENT_EMAIL_ADDRESS = certificateFields.PersonResponsibleEmail;

  let emailUserHtml 
  if (certificateFields.PersonResponsibleEmail) {
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Generating user HTML template for email");
    emailUserHtml = await generateEmailUserHtml(certificateFields);
    if (Logs.LogLevel <= Logs.LogLevelEnum.privacyExposing) console.log("emailUserHtml", emailUserHtml);
  } else {
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("PersonResponsibleEmail is not supplied so not generating user HTML template for email");
  }

  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Generating business HTML template for email");
  const emailUBusinessHtml = await generateEmailBusinessHtml(certificateFields);
  if (Logs.LogLevel <= Logs.LogLevelEnum.privacyExposing) console.log("emailUBusinessHtml", emailUBusinessHtml);

  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Generating HTML template for custom PDF");
  const pdfHtml = await generatePdfHtml(certificateFields);
  if (Logs.LogLevel <= Logs.LogLevelEnum.privacyExposing) console.log("pdfHtml", pdfHtml);

  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Generating custom PDF");
  const pdf = await pdfSDK.generatePDF({
    body: {
      html: pdfHtml,
    },
  });

  if (Logs.LogLevel <= Logs.LogLevelEnum.error)  console.log("Sending email");

  const oneblinkEnvironment = process.env.ONEBLINK_ENVIRONMENT!
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("oneblinkEnvironment", oneblinkEnvironment);
  
  const mailgunOptions = {
    testmode: false,
    internalEmail: false
  }

  const source = 'OneBlinkApi'

  if (certificateFields.PersonResponsibleEmail) {
    const emailUserProps: MailGun.Props = {
      to: RECIPIENT_EMAIL_ADDRESS,
      from: SENDER_EMAIL_ADDRESS, 
      subject: `${certificateFields.EnvPrefix}Parthenium Weed Carrier - Biosecurity Certificate - ${certificateFields.DigitalReferenceCode}`,
      html: emailUserHtml ?? '',
      attachments: [{
        data: pdf,
        filename: `PartheniumWeedCarrier-BiosecurityCertificate-${certificateFields.DigitalReferenceCode}.pdf`
      }]
    }
    await MailGun.sendEmail(emailUserProps, oneblinkEnvironment, source, mailgunOptions);
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Sent user email via MailGun")
  } else {
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("PersonResponsibleEmail is not supplied so not sending user email via MailGun");
  }

  const emailBusinessProps: MailGun.Props = {
    to: businessEmail,
    from: SENDER_EMAIL_ADDRESS, 
    subject: `${certificateFields.EnvPrefix}Inspector Copy - Parthenium Weed Carrier - Biosecurity Certificate - ${certificateFields.DigitalReferenceCode}`,
    html: emailUBusinessHtml,
    attachments: [{
      data: pdf,
      filename: `PartheniumWeedCarrier-BiosecurityCertificate-${certificateFields.DigitalReferenceCode}.pdf`
    }]
  }
  await MailGun.sendEmail(emailBusinessProps, oneblinkEnvironment, source, mailgunOptions);
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Sent business email via MailGun")

  return pdf.toString('base64')
}