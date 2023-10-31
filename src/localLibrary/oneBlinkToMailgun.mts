import OneBlink from "@oneblink/sdk"
import * as MailGun from "../lib/mailgunWrapper.mjs";

import { CertificateFields, FormApprovalFlowInstanceSubset } from "../projectTypes.js";
import { generatePdfHtml, generateEmailUserHtml, generateEmailBusinessHtml } from "../templates/index.mjs";

const pdfSDK = new OneBlink.PDF({
  accessKey: process.env.PDF_ACCESS_KEY!,
  secretKey: process.env.PDF_SECRET_KEY!,
});

export async function sendMail(certificateFields: CertificateFields, businessEmail: string){

  const SENDER_EMAIL_ADDRESS = process.env.SENDER_EMAIL_ADDRESS;

  console.log("PersonResponsibleEmail", certificateFields.PersonResponsibleEmail);
  const RECIPIENT_EMAIL_ADDRESS = certificateFields.PersonResponsibleEmail;

  console.log("Generating user HTML template for email");
  const emailUserHtml = await generateEmailUserHtml(certificateFields);
  console.log("emailUserHtml", emailUserHtml);

  console.log("Generating business HTML template for email");
  const emailUBusinessHtml = await generateEmailBusinessHtml(certificateFields);
  console.log("emailUBusinessHtml", emailUBusinessHtml);

  console.log("Generating HTML template for custom PDF");
  const pdfHtml = await generatePdfHtml(certificateFields);
  console.log("pdfHtml", pdfHtml);

  console.log("Generating custom PDF");
  const pdf = await pdfSDK.generatePDF({
    body: {
      html: pdfHtml,
    },
  });

  console.log("Sending email");

  const oneblinkEnvironment = process.env.ONEBLINK_ENVIRONMENT!
  console.log("oneblinkEnvironment", oneblinkEnvironment);
  
  const mailgunOptions = {
    testmode: false,
    internalEmail: false
  }

  const source = 'OneBlinkApi'

  const emailUserProps: MailGun.Props = {
    to: RECIPIENT_EMAIL_ADDRESS,
    from: SENDER_EMAIL_ADDRESS, 
    subject: `${certificateFields.EnvPrefix}Parthenium Weed Carrier - Biosecurity Certificate - ${certificateFields.DigitalReferenceCode}`,
    html: emailUserHtml,
    attachments: [{
      data: pdf,
      filename: `PartheniumWeedCarrier-BiosecurityCertificate-${certificateFields.DigitalReferenceCode}.pdf`
    }]
  }
  await MailGun.sendEmail(emailUserProps, oneblinkEnvironment, source, mailgunOptions);
  console.log("Sent user email via MailGun")

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
  console.log("Sent business email via MailGun")

}