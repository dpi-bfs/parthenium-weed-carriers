import * as Logs from "./BfsLibrary/logs.mjs"

interface Response {
  setStatusCode(code: number): void;
  setHeader(name: string, value: string): void;
  setPayload(payload: { [key: string]: any }): void;
}

export let post = async function webhook(req: object, res: Response) {

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("In form-level-validation");

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("req", JSON.stringify(req, null, 2));

  let submission = req.body.submission

  var carriers = submission.Carriers || [];

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("carriers", JSON.stringify(carriers, null, 2));

  var carriersItemCount = carriers.length;

  function isValidCarrierType(type) {
    return type === 1 || type === 2;
  }

  var isValid = false;
  var errorMessage = "";

  if (Logs.LogLevel <= Logs.LogLevelEnum.info) console.log("carriersItemCount", carriersItemCount);

  if (carriersItemCount === 1) {
    var carrierType = Number(carriers[0].CarrierType);
    if (isValidCarrierType(carrierType)) {
      isValid = true;
    } else {
      errorMessage = "Invalid carrier type. Carrier type must be 1 or 2.";
    }
  } else if (carriersItemCount === 2) {
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
