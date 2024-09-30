import * as Logs from "./BfsLibrary/logs.mjs";
import { FormElementLists } from '@oneblink/sdk';

interface Response {
  setStatusCode(code: number): void;
  setHeader(name: string, value: string): void;
  setPayload(payload: { [key: string]: any }): void;
}


// async function getListItems() {
//   try {

//     const formElementListsClient = new FormElementLists({
//       accessKey: process.env.FORMS_ACCESS_KEY!,
//       secretKey: process.env.FORMS_SECRET_KEY!,
//     });

//     try {
//       // Search for the list by name using searchFormElementLists
//       const searchResult = await formElementListsClient.searchFormElementLists({
//         name: 'Parthenium - Carrier Type',
//       });
  
//       if (searchResult.meta.total === 0) {
//         console.log('List not found.');
//         return;
//       }
  
//       // Assuming the first matched list is the desired one
//       const list = searchResult.formElementLists[0];
//       const listId = list.id;
  
//       // Retrieve the list details using the list ID
//       const listDetails = await formElementListsClient.getFormElementList(listId);
  
//       // Output the list items
//       console.log('List Items:', listDetails.items);
//     } catch (error) {
//       console.error('Error retrieving list items:', error);
//     }
// }

export let post = async function webhook(req: object, res: Response) {

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("In form-level-validation");
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("req", JSON.stringify(req, null, 2));

  let submission = req.body.submission

  var carriers = submission.Carriers || [];

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("carriers", JSON.stringify(carriers, null, 2));

  var carriersItemCount = carriers.length;

  const carrierTypes = [
    "Grain harvester - optionally including comb or front",
    "Comb trailer - optionally including comb or front"
  ]

  function isValidCarrierType(type) {
    return type === carrierTypes[0] || type === carrierTypes[1];
  }

  var isValid = false;
  var errorMessage = "Error on Movement details page > Carriers. ";

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("carriersItemCount", carriersItemCount);

  if (carriersItemCount === 1) {
    var carrierType = carriers[0].CarrierType;
    if (isValidCarrierType(carrierType)) {
      isValid = true;
    } else {
      errorMessage += `Invalid carrier type. Carrier type must be '${carrierTypes[0]}' or '${carrierTypes[1]}'. But it was '${carrierType}'`;
    }

  } else if (carriersItemCount === 2) {
    var carrierType1 = carriers[0].CarrierType;
    var carrierType2 = carriers[1].CarrierType;

    if (isValidCarrierType(carrierType1) && isValidCarrierType(carrierType2)) {
      if (carrierType1 !== carrierType2) {
        isValid = true;
      } else {
        errorMessage +=  "When selecting two carriers, their types must be different. Please correct the carrier types and re-submit.";
      }
    } else {
      errorMessage +=  `Invalid carrier types. Each carrier type must be '${carrierTypes[0]}' or '${carrierTypes[1]}'. But the first carrier type was '${carrierType1}'; and the second carrier type was '${carrierType2}'`;
    }

  } else {
    errorMessage += "Please select either one carrier, or two carriers with different types.";
  }

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("isValid", isValid);
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("About to return from form-level-validation");
  
  if (isValid) {
    return res.setStatusCode(200)
  } else {
    return res.setStatusCode(400).setPayload({
      message: errorMessage
    })
  }
};
