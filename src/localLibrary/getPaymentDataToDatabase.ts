import * as ProjectTypes from "../projectTypes.js";

export function getPaymentDataToDatabase(baseFormSubmission,
  formSubmissionPayment,
  ToFirstName: string,
  ToLastName: string,
  ToPhone: string,
  ToEmail: string | undefined,
  ToBusinessName: string | undefined,
  ToAbn: string | undefined
) {

  let paymentDataToDatabase!: ProjectTypes.PaymentDataToDatabase;


  if (formSubmissionPayment) {
    paymentDataToDatabase = {
      PaymentAddedViaFormID: baseFormSubmission.BaseFormId,
      PaymentAddedViaFormTrackingCode: baseFormSubmission.trackingCode,
      TaxInvoiceToFirstName: ToFirstName,
      TaxInvoiceToLastName: ToLastName,
      TaxInvoiceToPhone: ToPhone,
      TaxInvoiceToEmail: ToEmail,
      TaxInvoiceToAbn: ToAbn,
      TaxInvoiceToBusinessName: ToBusinessName,
      BiosecurityCertificateFee: baseFormSubmission.BiosecurityCertificateFee,
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