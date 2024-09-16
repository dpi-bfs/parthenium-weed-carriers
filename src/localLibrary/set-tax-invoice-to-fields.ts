import Boom from "@hapi/boom";
import * as Logs from "../BfsLibrary/logs.mjs"

export function setTaxInvoiceToFields(submission) {
  let toFirstName
  let toLastName
  let toAbn 
  let toBusinessName: string | undefined;


  if (submission.TaxInvoiceTo.includes("Person responsible")) {
    toFirstName = submission.PersonResponsibleFirstName
    toLastName = submission.PersonResponsibleLastName
    toAbn = submission.PersonResponsibleAbn

    if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log(`111 toFirstName ${toFirstName}`);

  } else if (submission.TaxInvoiceTo.includes("Owner")) {

    if (submission.Owner?.includes("Another person")) {
      toFirstName = submission.PersonResponsibleFirstName
      toLastName = submission.PersonResponsibleLastName
      
    } else if (submission.OwnerFirstName){
      toFirstName = submission.OwnerFirstName
      toLastName = submission.OwnerLastName

    } else {
      throw Boom.badRequest('Unexpected TaxInvoiceTo and Owner V Responsible Person combination:' +
           ` TaxInvoiceTo: ${submission.TaxInvoiceTo};` +
           ` Owner: ${submission.Owner};` +
           ` PersonResponsibleFirstName: ${submission.PersonResponsibleFirstName};` +
           ` OwnerFirstName: ${submission.OwnerFirstName};`
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
    ToBusinessName: toBusinessName,
    ToAbn: formatAbnWithSpaces,
  }
}