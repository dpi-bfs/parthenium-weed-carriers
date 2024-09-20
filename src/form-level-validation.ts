import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs";
import * as OneBlink from "@oneblink/sdk"
import * as Logs from "./BfsLibrary/logs.mjs"

export const formsSDK = new OneBlink.Forms({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
});

interface Response {
  setStatusCode(code: number): void;
  setHeader(name: string, value: string): void;
  setPayload(payload: { [key: string]: any }): void;
}

export let post = async function webhook(req: object, res: Response) {

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("In form-level-validation");

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("req", req);

  let submission = req.body.submission

  var carriers = submission.Carriers || [];

  var itemCount = carriers.length;

  function isValidCarrierType(type) {
    return type === 1 || type === 2;
  }

  var isValid = false;
  var errorMessage = "";

  if (itemCount === 1) {
    var carrierType = Number(carriers[0].CarrierType);
    if (isValidCarrierType(carrierType)) {
      isValid = true;
    } else {
      errorMessage = "Invalid carrier type. Carrier type must be 1 or 2.";
    }
  } else if (itemCount === 2) {
    var carrierType1 = Number(carriers[0].CarrierType);
    var carrierType2 = Number(carriers[1].CarrierType);

    if (isValidCarrierType(carrierType1) && isValidCarrierType(carrierType2)) {
      if (carrierType1 !== carrierType2) {
        isValid = true;
      } else {
        errorMessage = "When selecting two carriers, their types must be different.";
      }
    } else {
      errorMessage = "Invalid carrier types. Each carrier type must be 1 or 2.";
    }
  } else {
    errorMessage = "Please select either one carrier, or two carriers with different types.";
  }

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("About to return from form-level-validation");
  if (isValid) {
    return res.setStatusCode(200)
  } else {
    return res.setStatusCode(400).setPayload({
      message: errorMessage
    })
  }
};
