"use strict";

import Boom from "@hapi/boom"
import OneBlink from "@oneblink/sdk"

import * as Logs from "./lib/logs.mjs"

const approvalsSDK = new OneBlink.Approvals({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
})

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

interface Response {
  setStatusCode(code: number): void;
  setHeader(name: string, value: string): void;
  setPayload(payload: { [key: string]: any }): void;
}

// Makes it so the approval form shares the same externalID as the base form.
// In the OneBlink Console > Submissions, the "External Id" will appear for both forms.
//
// On approval submission this fires twice. 
// Once when previousFormSubmissionApprovalId has a value;
// Then when externalIdUrlSearchParam has a value;
// So we have to handle both cases
export let post = async function webhook(req: Request, res: Response) {
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("approval-form-receipt-id start");
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Validating webhook request payload");
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("req", req);
  
  if (req.body &&
      req.body.formsAppId &&
      req.body.formId) {

    let baseFormExternalId;

    if(req.body.previousFormSubmissionApprovalId) {
      const formSubmissionApproval =
      await approvalsSDK.getFormSubmissionApproval(
        req.body.previousFormSubmissionApprovalId
      )
  
      if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("formSubmissionApproval", formSubmissionApproval)
      baseFormExternalId = formSubmissionApproval.formSubmissionMeta.externalId
      
    } else if(req.body.externalIdUrlSearchParam){

      baseFormExternalId = req.body.externalIdUrlSearchParam

    } else {
      throw Boom.badData("res not set", res);
    }  

    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("baseFormExternalId", baseFormExternalId);  
    res.setStatusCode(200);
    res.setHeader('content-type', 'application/json');
    res.setPayload({
      externalId: baseFormExternalId
    })
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("res set", res);

  } else  {
    throw Boom.badRequest("Invalid webhook request payload.", req);
  }

  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Webhook completed successfully");

  // No need to return anything given we've set the res object.
};
