import Boom from "@hapi/boom"

import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs";
import * as ProjectTypes from "./projectTypes.js";
import { FormApprovalFlowInstance } from "@oneblink/types/typescript/approvals.js";

import * as OneBlinkToMailgun  from "./localLibrary/oneBlinkToMailgun.mjs";
import { setTaxInvoiceToFields } from "./localLibrary/set-tax-invoice-to-fields.js";

import * as StringTools from "./BfsLibrary/stringTools.mjs";
import * as DateTimeTools from "./BfsLibrary/dateTime.mjs"

import { CertificateFields, FormApprovalFlowInstanceSubset, PaymentDataToDatabase } from "./projectTypes.js";
import *  as SendPostRequest from "./BfsLibrary/sendPostRequest.mjs"

import * as Base64Tools from "./localLibrary/base64Tools.mjs"
import * as Logs from "./BfsLibrary/logs.mjs"

import { primaryNswGovernmentLogo, getFormLinkAndImgQRCode, PartheniumWeedFormType } from "./templates/images.mjs"

import Moment from 'moment-timezone';

async function postToPowerAutomate(recordOfMovementAndInspection: ProjectTypes.RecordOfMovementAndInspection) {
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("Posting data to power automate");
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

function getPaymentDataToDatabase(recordOfMovementAndInspection: ProjectTypes.RecordOfMovementAndInspection, 
                                  formSubmissionPayment, 
                                  ToFirstName: string, 
                                  ToLastName: string, 
                                  ToBusinessName: string | undefined,
                                  ToAbn: string | undefined
                                  ) {

 let paymentDataToDatabase: PaymentDataToDatabase = {};

  if (formSubmissionPayment) {
    paymentDataToDatabase = {
      PaymentAddedViaFormID: recordOfMovementAndInspection.BaseFormId,
      PaymentAddedViaFormTrackingCode: recordOfMovementAndInspection.trackingCode,
      TaxInvoiceToFirstName: ToFirstName,
      TaxInvoiceToLastName: ToLastName,
      TaxInvoiceToAbn: ToAbn,
      TaxInvoiceToBusinessName: ToBusinessName,
      BiosecurityCertificateFee: recordOfMovementAndInspection.BiosecurityCertificateFee,
      SubmissionPaymentStatus: formSubmissionPayment.paymentTransaction.status,
      SubmissionPaymentResponseCode: formSubmissionPayment.paymentTransaction.responseCode,
      SubmissionPaymentResponseDescription: formSubmissionPayment.paymentTransaction.responseDescription,
      SubmissionPaymentReceiptNumber: formSubmissionPayment.paymentTransaction.receiptNumber,
      SubmissionPaymentTransactionDateTime: formSubmissionPayment.paymentTransaction.transactionTime,
      SubmissionPaymentPrincipalAmount: formSubmissionPayment.paymentTransaction.principalAmount.amount,
      SubmissionPaymentSurchargeAmount: formSubmissionPayment.paymentTransaction.surchargeAmount.amount,
      SubmissionPaymentTotalAmount: formSubmissionPayment.paymentTransaction.totalAmount.amount
    }
  }

  return paymentDataToDatabase;
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


  // We need to add paymentDataToDatabase later.
  let recordOfMovementAndInspection: ProjectTypes.RecordOfMovementAndInspection = {
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

  const { formSubmissionPayments } = await OneBlinkHelpers.formsSDK.getFormSubmissionMeta(req.body.submissionId)

  let formSubmissionPayment;
  let ToFirstName;
  let ToLastName;
  let ToBusinessName;
  let ToAbn; 

  if (formSubmissionPayments && formSubmissionPayments[0]) {
    formSubmissionPayment = formSubmissionPayments[0];
    ({ ToFirstName, ToLastName, ToBusinessName, ToAbn } = setTaxInvoiceToFields(baseFormSubmission))
  }

  const ApprovalFlowUpdatedAtLocal = DateTimeTools.formatDateCustom(recordOfMovementAndInspection.ApprovalFlowUpdatedAt, 'Australia/Sydney')

  const {formLinkPrefilled: nswDestinationsNotificationFormLink, imgHtml: nswDestinationsNotificationFormLinkQRImg } = getFormLinkAndImgQRCode(recordOfMovementAndInspection.PaperCertificateNumber, PartheniumWeedFormType.NswDestinationsNotification)

  const {formLinkPrefilled: paymentAfterBorderCrossingFormLink, imgHtml: paymentAfterBorderCrossingFormLinkQRImg } = getFormLinkAndImgQRCode(recordOfMovementAndInspection.PaperCertificateNumber, PartheniumWeedFormType.PaymentAfterBorderCrossing)

  let paymentAfterBorderCrossingTextWithHtml ;

  // const paymentDoneTextWithHtml = `<p>This constitutes a (mini) Tax Invoice and receipt. Amount paid is GST-free and includes card surcharge. A detailed Tax Invoice was emailed to the responsible person or owner if they provided an email with the Record of Movement. <span class="todo">For a refund ... (todo).</span></p>`

  const checkedHtml = 'checked="checked"';
  let paymentRouteChecked_PayNowByCard_UserFilledRom;
  let paymentRouteChecked_PayNowByCard_CertifierFilledRom;
  let paymentRouteChecked_PayAfterBorderCrossing;
  let paymentRouteChecked_NoPaymentRequired;

  const paymentRouteSubsectionVisibilityDefault= "none";
  const paymentRouteSubsectionVisibilityShow = "block";
  let paymentRouteSubsectionVisibility_PayNowByCard = paymentRouteSubsectionVisibilityDefault;
  let paymentRouteSubsectionVisibility_PayAfterBorderCrossing = paymentRouteSubsectionVisibilityDefault;
  let paymentRouteSubsectionVisibility_NoPaymentRequired = paymentRouteSubsectionVisibilityDefault;


  switch (recordOfMovementAndInspection.PaymentRoute){
    case 'Pay now by card - user filled ROM' || undefined:
      // PaymentRoute is undefined as as user forced to pay at ROM stage; without PaymentRoute being shown on the form
      if (recordOfMovementAndInspection.IsInspectorFillingRom === "Yes") {
        throw Boom.badData("Assertion failure. Expected recordOfMovementAndInspection.IsInspectorFillingRom to be no but was yes.: " + recordOfMovementAndInspection.IsInspectorFillingRom)
      }
      // paymentAfterBorderCrossingTextWithHtml = paymentDoneTextWithHtml

      recordOfMovementAndInspection.PaymentRoute = 'Pay now by card - user filled ROM'
      paymentRouteChecked_PayNowByCard_UserFilledRom = checkedHtml;
      paymentRouteSubsectionVisibility_PayNowByCard = paymentRouteSubsectionVisibilityShow;
      break;

    case 'Pay now by card - certifier filled ROM':
      // paymentAfterBorderCrossingTextWithHtml = paymentDoneTextWithHtml
      paymentRouteChecked_PayNowByCard_CertifierFilledRom = checkedHtml;
      paymentRouteSubsectionVisibility_PayNowByCard = paymentRouteSubsectionVisibilityShow;
      break;

    case 'Pay after border crossing':
      // paymentAfterBorderCrossingTextWithHtml = `<p>You must pay after the border crossing into NSW, within 7 days. Please click <a href="${paymentAfterBorderCrossingFormLink}">Parthenium Weed Carriers - Biosecurity Certificate - Payment after Border Crossing</a>, or scan the QR code. Either will fill the form with your unique "Paper certificate number".</p>`
      paymentRouteChecked_PayAfterBorderCrossing = checkedHtml;
      paymentRouteSubsectionVisibility_PayAfterBorderCrossing = paymentRouteSubsectionVisibilityShow;
      break;

    case 'No payment required':
      // paymentAfterBorderCrossingTextWithHtml = `<p>No payment is required. For example, because this is for the 2023 season when fees where waived in general.</p>`
      paymentRouteChecked_NoPaymentRequired = checkedHtml;
      paymentRouteSubsectionVisibility_NoPaymentRequired = paymentRouteSubsectionVisibilityShow;
      break;

    default: 
      throw Boom.badData("Unexpected recordOfMovementAndInspection.PaymentRoute case in switch: " + recordOfMovementAndInspection.PaymentRoute)
  }

  if (formSubmissionPayment && formSubmissionPayments && formSubmissionPayments[0]) {
    // Adds PaymentDataToDatabase to recordOfMovementAndInspection
    recordOfMovementAndInspection = { ...recordOfMovementAndInspection,  ...getPaymentDataToDatabase(recordOfMovementAndInspection, formSubmissionPayment, ToFirstName, ToLastName, ToBusinessName, ToAbn)};
  }

  const transactionDateFormatted = Moment.tz(formSubmissionPayment?.paymentTransaction?.transactionTime, 'Australia/Sydney').format('DD/MM/YYYY');
  
  if (recordOfMovementAndInspection.InspectionResult.startsWith("Passed")) {
    let certificateFields: CertificateFields = {
      Logo: primaryNswGovernmentLogo,
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
      QRCodeImage: qrCodeImage,

      PaymentRoute: recordOfMovementAndInspection.PaymentRoute,
      PaymentRouteChecked_PayNowByCard_UserFilledRom: paymentRouteChecked_PayNowByCard_UserFilledRom,
      PaymentRouteChecked_PayNowByCard_CertifierFilledRom: paymentRouteChecked_PayNowByCard_CertifierFilledRom,
      PaymentRouteChecked_PayAfterBorderCrossing: paymentRouteChecked_PayAfterBorderCrossing,
      PaymentRouteChecked_NoPaymentRequired: paymentRouteChecked_NoPaymentRequired,

      PaymentRouteSubsectionVisibility_PayNowByCard: paymentRouteSubsectionVisibility_PayNowByCard,
      PaymentRouteSubsectionVisibility_PayAfterBorderCrossing: paymentRouteSubsectionVisibility_PayAfterBorderCrossing,
      PaymentRouteSubsectionVisibility_NoPaymentRequired: paymentRouteSubsectionVisibility_NoPaymentRequired,
      
      ReceiptNumber: formSubmissionPayment?.paymentTransaction?.receiptNumber,
      TransactionDate: transactionDateFormatted,
      ToFirstName: ToFirstName,
      ToLastName: ToLastName,
      ToBusinessName: ToBusinessName,

      AmountPaid: formSubmissionPayment?.paymentTransaction?.totalAmount.displayAmount,
      // CardholderName: formSubmissionPayment?.paymentTransaction?.creditCard.cardholderName,

      PaymentAfterBorderCrossingFormLink: paymentAfterBorderCrossingFormLink,
      PaymentAfterBorderCrossingTextWithHtml: paymentAfterBorderCrossingTextWithHtml,
      PaymentAfterBorderCrossingFormLinkQRImg: paymentAfterBorderCrossingFormLinkQRImg,
      // FigurePaymentAfterBorderCrossingQRCodeVisibility: figurePaymentAfterBorderCrossingQRCodeVisibility,

      NswDestinationsNotificationFormLink: nswDestinationsNotificationFormLink,
      NswDestinationsNotificationFormLinkQRImg: nswDestinationsNotificationFormLinkQRImg,
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
