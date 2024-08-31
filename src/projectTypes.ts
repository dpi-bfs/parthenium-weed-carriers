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
  ReceiptNumber: string,
  CardholderName: string,
  AmountPaid: string
}

// export interface WestpacQuickStreamLinks {
//   href: string;
//   rel: string;
//   requestMethod: string;
// }
// export interface BaseFormSubmissionPayment {
//   formId: number;
//   id: string;
//   status: "PENDING" | "SUCCEEDED" | "FAILED";
//   submissionId: string;
// }

// export interface WestpacQuickStreamPayment extends BaseFormSubmissionPayment {
//   paymentTransaction?: {
//       authorisationCode?: string;
//       authorisationTraceId: string;
//       authorisationType?: string;
//       bankAccount?: {
//           accountName?: string;
//           accountNumber: string;
//           bsb: string;
//       };
//       cancellationType?: string;
//       comment: string;
//       creditCard?: {
//           accountToken: string;
//           accountType: string;
//           cardNumber: string;
//           cardScheme: string;
//           cardType: string;
//           cardholderName: string;
//           customerId: string;
//           defaultAccount: boolean;
//           expiryDateMonth: string;
//           expiryDateYear: string;
//           links: WestpacQuickStreamLinks[];
//           maskedCardNumber4Digits: string;
//           panType: string;
//           walletProvider: string;
//       };
//       customerReferenceNumber: string;
//       debtRepayment: boolean;
//       directEntryAccount?: {
//           accountName: string;
//           currency: string;
//           directEntryUserId: string;
//           directEntryUserName?: string;
//           displayName: string;
//           remitterName: string;
//           settlementAccountNumber: string;
//           settlementBsb: string;
//       };
//       fraudGuardResult: string | null;
//       ipAddress: string;
//       links: WestpacQuickStreamLinks[];
//       merchantAccount?: {
//           acquiringInstitution: string;
//           currency: string;
//           displayName: string;
//           merchantId: string;
//           merchantName: string;
//           settlementAccountNumber: string;
//           settlementBsb: string;
//           settlementSurchargeAccountNumber?: string;
//           settlementSurchargeBsb?: string;
//       };
//       merchantAdviceCode: string;
//       merchantCountry?: string;
//       merchantLocation?: string;
//       merchantName?: string;
//       merchantPostCode?: string;
//       merchantState?: string;
//       merchantStreetAddress?: string;
//       metadata: Record<string, string>;
//       networkTransactionId?: string;
//       nzBankAccount?: {
//           accountToken: string;
//           accountType: string;
//           currency: string;
//           customerId: string;
//           defaultAccount: boolean;
//           displayName: string;
//           links: WestpacQuickStreamLinks[];
//           nzAccountName: string;
//           nzAccountNumber: string;
//           nzAccountSuffix: string;
//           nzBankCode: string;
//           nzBranchCode: string;
//       };
//       nzDirectEntryAccount?: {
//           currency: string;
//           debitUserId: string;
//           displayName: string;
//           nzAccountName: string;
//           nzAccountNumber: string;
//           nzAccountSuffix: string;
//           nzBankCode: string;
//           nzBranchCode: string;
//       };
//       originalReceiptNumber?: string;
//       paymentReferenceNumber: string;
//       principalAmount: {
//           amount: number;
//           currency: string;
//           displayAmount: string;
//       };
//       receiptNumber: string;
//       refundable: boolean;
//       responseCode: string;
//       responseDescription: string;
//       settlementDate: string;
//       source: string;
//       status: string;
//       subMerchantId?: string;
//       summaryCode: string;
//       surchargeAmount: {
//           amount: number;
//           currency: string;
//           displayAmount: string;
//       };
//       totalAmount: {
//           amount: number;
//           currency: string;
//           displayAmount: string;
//       };
//       transactionTime: string;
//       transactionType: string;
//       voidable: boolean;
//   };
//   type: OneBlinkTypes.SubmissionEventTypes.WestpacQuickWebSubmissionEvent["type"];
// }

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
  PaymentRoute: string
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
