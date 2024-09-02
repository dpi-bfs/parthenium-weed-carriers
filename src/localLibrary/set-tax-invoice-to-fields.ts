import Boom from "@hapi/boom";

export function setTaxInvoiceToFields(submission) {
  let toFirstName
  let toLastName
  let toAbn 

  if (submission.TaxInvoiceTo.includes("Person responsible")) {
    toFirstName = submission.PersonResponsibleFirstName
    toLastName = submission.PersonResponsibleLastName
    toAbn = submission.PersonResponsibleAbn

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

  let formatAbnWithSpaces 
  let toBusinessName
  if (toAbn) {
    formatAbnWithSpaces = "ABN: " + new Intl.NumberFormat('en-AU').format(toAbn.ABN.identifierValue).replace(/,/g, ' ');
    toBusinessName = toAbn.mainName.organisationName
  }

  return {
    ToFirstName: toFirstName,
    ToLastName: toLastName,
    ToBusinessName: toBusinessName,
    ToAbn: formatAbnWithSpaces,
  }
}