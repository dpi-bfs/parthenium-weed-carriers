import Boom from "@hapi/boom";
import * as Logs from "../BfsLibrary/logs.mjs"

export function setTaxInvoiceToFields(submission) {
  let toFirstName
  let toLastName
  let toPhone
  let toEmail
  let toAbn 
  let toBusinessName: string | undefined;

  console.log(`setTaxInvoiceToFields Logs.LogLevel : ${Logs.LogLevel}`)

  if (submission.TaxInvoiceTo.includes("Person responsible")) {
    toFirstName = submission.PersonResponsibleFirstName
    toLastName = submission.PersonResponsibleLastName
    toPhone = submission.PersonResponsibleMobilePhone
    toEmail = submission.PersonResponsibleEmail
    toAbn = submission.PersonResponsibleAbn

    if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log(`111 toFirstName ${toFirstName}`);

  } else if (submission.TaxInvoiceTo.includes("Owner")) {

    if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log(`submission.Owner?.includes("Person responsible")`, submission.Owner?.includes("Person responsible"));
    
    // From ROM Form
    if (submission.Owner) {
      if (submission.Owner?.includes("Person responsible")) {
        toFirstName = submission.PersonResponsibleFirstName
        toLastName = submission.PersonResponsibleLastName
        toPhone = submission.PersonResponsibleMobilePhone
        toEmail = submission.PersonResponsibleEmail
        
      } else if (submission.Owner?.includes("Another person")){
        toFirstName = submission.OwnerFirstName
        toLastName = submission.OwnerLastName
        toPhone = submission.OwnerPhone
        toEmail = submission.OwnerEmail
      } else {
        throw Boom.badRequest('Unexpected TaxInvoiceTo and Owner V Responsible Person combination, under submission.Owner:' +
          ` * TaxInvoiceTo: ${submission.TaxInvoiceTo};` +
          ` * Owner: ${submission.Owner};` +
          ` * PersonResponsibleFirstName: ${submission.PersonResponsibleFirstName};` +
          ` * OwnerFirstName: ${submission.OwnerFirstName};`
         );
      }

    // From Payment after border crossing form
    } else if (submission.Owner == null) {

      if (submission.OwnerFirstName) {
        toFirstName = submission.OwnerFirstName
        toLastName = submission.OwnerLastName
        toPhone = submission.OwnerPhone
        toEmail = submission.OwnerEmail
      } else {
        throw Boom.badRequest('Unexpected TaxInvoiceTo and Owner V Responsible Person combination, under if (submission.OwnerFirstName) :' +
          ` * TaxInvoiceTo: ${submission.TaxInvoiceTo};` +
          ` * Owner: ${submission.Owner};` +
          ` * PersonResponsibleFirstName: ${submission.PersonResponsibleFirstName};` +
          ` * OwnerFirstName: ${submission.OwnerFirstName};`
         );
      }
      
    } else {
      throw Boom.badRequest('Unexpected TaxInvoiceTo and Owner V Responsible Person combination, under if (submission.TaxInvoiceTo.includes("Person responsible"):' +
           ` * TaxInvoiceTo: ${submission.TaxInvoiceTo};` +
           ` * Owner: ${submission.Owner};` +
           ` * PersonResponsibleFirstName: ${submission.PersonResponsibleFirstName};` +
           ` * OwnerFirstName: ${submission.OwnerFirstName};`
          );
    }

    toAbn = submission.OwnerAbn

  } else {
    throw Boom.badRequest("Unexpected TaxInvoiceTo: ", submission.TaxInvoiceTo);
  }

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log(`222 toFirstName ${toFirstName}`);

  let formatAbnWithSpaces 
  
  if (toAbn) {
    formatAbnWithSpaces = "ABN: " + new Intl.NumberFormat('en-AU').format(toAbn.ABN.identifierValue).replace(/,/g, ' ');
    toBusinessName = toAbn.mainName.organisationName
    if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log(`111 toBusinessName ${toBusinessName}`);
  }
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log(`222 toBusinessName ${toBusinessName}`);

  return {
    ToFirstName: toFirstName,
    ToLastName: toLastName,
    ToPhone: toPhone,
    ToEmail: toEmail,
    ToBusinessName: toBusinessName,
    ToAbn: formatAbnWithSpaces,
  }
}