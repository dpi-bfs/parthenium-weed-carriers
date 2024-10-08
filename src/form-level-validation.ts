import * as Logs from "./BfsLibrary/logs.mjs";
import * as OneBlinkSdk from '@oneblink/sdk';
import * as OneBlinkTypes from '@oneblink/sdk/tenants/types.js';
import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs";

interface Response {
  setStatusCode(code: number): void;
  setHeader(name: string, value: string): void;
  setPayload(payload: { [key: string]: any }): void;
}


function getOptionsValues(data: any, formsAppEnvironmentId: number): string[] {
  // Find the environment with the specified formsAppEnvironmentId
  const environment = data.environments.find((env: any) => env.formsAppEnvironmentId === formsAppEnvironmentId);

  if (environment) {
    // Map over the options to extract values
    return environment.options.map((option: any) => option.value);
  } else {
    console.log(`Environment with formsAppEnvironmentId ${formsAppEnvironmentId} not found.`);
    return [''];
  }
}

function findListById(formElementLists: OneBlinkTypes.FormTypes.FormElementOptionSet[], id: number) {
  return formElementLists.find((item) => item.id === id);
}

async function getListItemOptionValues(listId: number): Promise<string[]> {

  try {
      const formElementListsClient = new OneBlinkSdk.FormElementLists({
        accessKey: process.env.FORMS_ACCESS_KEY!,
        secretKey: process.env.FORMS_SECRET_KEY!,
      });

      const searchParams: OneBlinkTypes.FormElementListSearchOptions = {
        limit: 100,
        offset: 0,
        organisationId: process.env.ORGANISATION_ID!,
      }

      const { formElementLists, meta } = await formElementListsClient.searchFormElementLists(searchParams);
  
      if (formElementLists.length === 0) {
        if (Logs.LogLevel <= Logs.LogLevelEnum.info)  console.log('List not found.');
      } else {

        const list = findListById(formElementLists, listId);
        console.log('list', JSON.stringify(list, null, 2))

        const listOptionValues = getOptionsValues(list, Number(process.env.ONEBLINK_ENVIRONMENT_ID!));
        console.log('listOptionValues', JSON.stringify(listOptionValues, null, 2));
        return listOptionValues;
      }
  
      // Output the list items
      console.log('formElementLists:', JSON.stringify(formElementLists, null, 2));
    } catch (error) {
      console.error('Error retrieving list items:', error);
      return [''];
    } 
}

export let post = async function webhook(req: object, res: Response) { 

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("In form-level-validation");
  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("req", JSON.stringify(req, null, 2));
  // OneBlinkHelpers.validateWebhook(req);

  let submission = req.body.submission

  var carriers = submission.Carriers || [];

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("carriers", JSON.stringify(carriers, null, 2));

  var carriersItemCount = carriers.length;

  // const carrierTypes = [
  //   "Grain harvester - optionally including comb or front",
  //   "Comb trailer - optionally including comb or front"
  // ]

  const partheniumCarrierTypeListId = 551;
  let carrierTypes: string[] = await getListItemOptionValues(partheniumCarrierTypeListId);

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("carrierTypes", carrierTypes);

  function isValidCarrierType(type: string) {
    return type === carrierTypes[0] || type === carrierTypes[1];
  }

  var isValid = false;
  var errorMessage = "Error in Carriers. ";

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
    if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("errorMessage", errorMessage);
    return res.setStatusCode(400).setPayload({
      message: errorMessage
    })
  }
};
