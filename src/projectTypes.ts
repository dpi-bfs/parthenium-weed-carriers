import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs"
import * as OneBlink from "@oneblink/sdk"
import * as OneBlinkTypes from "@oneblink/types"

export interface Carrier {
  CarrierType: string,
  CarrierMake: string,
  CarrierModel: string,
  CarrierRegistrationNumber: string,
  CarrierSerialNumber: string
}

export interface CertificateFields {
  Logo: string,
  PaperCertificateNumber: string,
  InspectorName: string,
  Carriers: Carrier[],
  CertificateInForceForDays: number,
  CertificateInForceExpiryDateTime: string,
  InspectorRole: string,
  InspectionDate: string
  InspectorAgency: string, 
  PersonResponsibleName: string, // For email template
  PersonResponsibleEmail: string, // For email template
  ApprovalFlowUpdatedAt: string,
  DigitalReferenceCode: string,
  BaseFormSubmissionId: string,
  ApprovalFormSubmissionId: string,
  EnvPrefix: string,
  QRCodeImage: string // Base64 image.
  PaymentRoute: string,
  PaymentRouteChecked_PayNowByCard_UserFilledRom: string | undefined,
  PaymentRouteChecked_PayNowByCard_CertifierFilledRom: string | undefined,
  PaymentRouteChecked_PayNowByCard_PayAfterBorderCrossing: string | undefined,
  PaymentRouteChecked_PayNowByCard_NoPaymentRequired: string | undefined,
  ReceiptNumber: string,
  ToFirstName: string | undefined,
  ToLastName: string | undefined,
  ToBusinessName: string | undefined,
  TransactionDate: string,
  // CardholderName: string,
  AmountPaid: string,
  PaymentAfterBorderCrossingFormLink: string,
  PaymentAfterBorderCrossingFormLinkQRImg: string,
  PaymentAfterBorderCrossingTextWithHtml: string | undefined,
  FigurePaymentAfterBorderCrossingQRCodeVisibility: 'visible' | 'hidden',
  NswDestinationsNotificationFormLink: string,
  NswDestinationsNotificationFormLinkQRImg: string,
}

/**
 * When defining project form submission interfaces
 * we don't list all the possible properties, only enough properties
 * to remove typescript errors when referenced elsewhere.
 * 
 * It's a feature that we don't list all the properties as this
 * allows many form elements to be changed without breaking typechecking.
 */

export interface BaseFormSubmissionProjectSpecific extends OneBlinkHelpers.BaseFormSubmission {
  BaseFormSubmissionId: string,
  BaseFormSubmissionTimestamp: string,
  BaseFormId: number,
  PersonResponsibleFirstName: string,
  PersonResponsibleLastName: string,
  PersonResponsibleEmail: string,
  IsInspectorFillingRom: string,
  InspectorFillingRom: string,  
  Carriers: Carrier[],
  PaymentRoute: string,
  TaxInvoiceTo: string,
}

export interface ApprovalFormSubmissionProjectSpecific extends OneBlinkHelpers.ApprovalFormSubmission {
  ApprovalFormId: number,
  Carriers: Carrier[],
  CertificateInForceForDays: number,
  InspectionDate: string,
  PaperCertificateNumber: string,
  InspectionResult: string,
  InspectionFacility: string
}

export interface ApprovalFormDataProjectSpecific extends OneBlinkHelpers.ApprovalFormData {
  approvalFormSubmission: ApprovalFormSubmissionProjectSpecific
}

export interface FormApprovalFlowInstanceSubset {
  InspectorName: string,
  InspectorEmail: string,
  ApprovalFlowUpdatedAt: string
}

export interface ExtraData {
  EnvPrefix: string,
  PowerAutomateSecretKey: string,
  BiosecurityCertificatePdf: string
}

export interface RecordOfMovementAndInspection extends 
  BaseFormSubmissionProjectSpecific, 
  ApprovalFormSubmissionProjectSpecific, 
  FormApprovalFlowInstanceSubset,
  ExtraData 
  {
  }
