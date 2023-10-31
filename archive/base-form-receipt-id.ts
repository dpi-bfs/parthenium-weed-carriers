/**
 * Currently doesn't fire when form in an wrapper. So not used.
 * See: WD | Receipt Generation https://nswfood.atlassian.net/browse/OF-1464
 */

import Boom from "@hapi/boom"
import * as Maths from "./lib/maths.mjs"

interface Request { 
  body: {
    formsAppId: number,
    formId: number,
    externalIdUrlSearchParam: string | null,
    draftId: string | null,
    preFillFormDataId: string | null,
    jobId: string | null,
    previousFormSubmissionApprovalId: string | null
  }
}

export let post = async function webhook(req: Request, res: object) {
  console.log("base-form-receipt-id start");
  console.log("Validating webhook request payload");
  console.log("req", req);
  
  if (req.body &&
      req.body.formsAppId &&
      req.body.formId) {

    const baseFormExternalId = Maths.generateExternalId(8);

    console.log("baseFormExternalId", baseFormExternalId);  
    res.setStatusCode(200);
    res.setHeader('content-type', 'application/json');
    res.setPayload({
      externalId: baseFormExternalId
    })
    console.log("res set", res);

  } else  {
    throw Boom.badRequest("Invalid webhook request payload.", req);
  }

  console.log("Webhook completed successfully");

  // No need to return anything given we've set the res object.
};
