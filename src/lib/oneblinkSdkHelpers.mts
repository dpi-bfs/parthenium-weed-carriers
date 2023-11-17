/**
 * Source: "John Bentley's \OneDrive - DPIE\Documents\Sda\Code\Typescript\library\"
 * Warning: Don't edit outside of that location.
 * Author: John Bentley
 */

import Boom from "@hapi/boom"

import OneBlink from "@oneblink/sdk"
import { SubmissionTypes } from "@oneblink/types";
import { FormApprovalFlowInstance } from "@oneblink/types/typescript/approvals.js";

import * as Logs from "./logs.mjs";


const formsSDK = new OneBlink.Forms({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
});

const approvalsSDK = new OneBlink.Approvals({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
})


export interface Request {
  body: {
    formId: number,
    formsAppId: number,
    submissionId: string,
    isDraft: boolean,
    submissionTimestamp: string,
    externalId: string,
    secret: string,
  },
  headers: {
    host: string,
    [key: string]: string
  },
  method: string,
  route: string,
  url: {
    host: string,
    hostname: string,
    params: any,
    pathname: string,
    protocol: string,
    query: any,
    queryString: string
  }
}


// BaseFormSubmission has **at least** the following defined fields
export interface BaseFormSubmission extends SubmissionTypes.S3SubmissionData {
  trackingCode: string,
  env?: string,
  BaseFormSubmissionId?: string 
}

export interface ApprovalFormSubmission extends SubmissionTypes.S3SubmissionData {
  trackingCodeApprovalCopy: string,
  ApprovalFormSubmissionId: string,
}

export interface ApprovalFormData {
  approvalFormSubmission: ApprovalFormSubmission,
  formApprovalFlowInstance: FormApprovalFlowInstance,
  approvalFormSubmissionId: string,
  approvalFormId: number
}


export function validateWebhook(req: Request) {
  console.log("Validating webhook request payload");
  if (
    !req.body ||
    !req.body.formId ||
    !req.body.submissionId ||
    !req.body.secret
  ) {
    throw Boom.badRequest("Invalid webhook request payload", req.body);
  }

  console.log("Authorizing webhook request");
  if (req.body.secret !== process.env.WEB_HOOK_SECRET) {
    throw Boom.forbidden("Unauthorised", req.body);
  }
}

export async function getBaseFormSubmission(formId: number, 
                                            submissionId: string, 
                                            isDraft: boolean
                                            ): Promise<BaseFormSubmission> {
  // console.log("req", req);

  console.log("Retrieving form data for submission", {
    formId,
    submissionId,
    isDraft ,
  });

  let { submission } = await formsSDK.getSubmissionData(
    formId,
    submissionId,
    isDraft
  );

  if (Logs.LogLevel <= Logs.LogLevelEnum.privacyExposing) console.log("submission", submission);
  return submission as unknown as BaseFormSubmission;
}


export async function getApprovalFormData(req: Request): Promise<ApprovalFormData> {

  let approvalFormSubmission: ApprovalFormSubmission = {} as ApprovalFormSubmission;
  let approvalFormSubmissionId = "";

  const {
    formSubmissionMeta,
    formApprovalFlowInstance,
    formSubmissionApprovals
  } = await formsSDK.getFormSubmissionMeta(req.body.submissionId);

  if (Logs.LogLevel <= Logs.LogLevelEnum.privacyExposing) console.log("formSubmissionMeta", formSubmissionMeta) // Has submissionTite
  if (formApprovalFlowInstance) {
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("formApprovalFlowInstance", formApprovalFlowInstance) // The one we want
  } 
  
  if (Logs.LogLevel <= Logs.LogLevelEnum.error)  console.log("formSubmissionApprovals", formSubmissionApprovals)
  
  let approvalFormId: number = 0;
  if (formSubmissionApprovals) {
    const approvalStatus = formSubmissionApprovals[0].status
    approvalFormSubmissionId = formSubmissionApprovals[0].approvalFormSubmissionId!
    approvalFormId = formSubmissionApprovals[0].approvalFormId ?? 0
    const approvalId = formSubmissionApprovals[0].id
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("approvalStatus", approvalStatus);
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("approvalFormSubmissionId", approvalFormSubmissionId);
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("approvalFormId", approvalFormId);
    if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("approvalId", approvalId);


    if(approvalFormId && approvalFormSubmissionId){
      // Must be the name "submission" to take what is returned from getSubmissionData.
      // But we rename it approvalFormSubmission
      const result = await formsSDK.getSubmissionData(
        approvalFormId,
        approvalFormSubmissionId,
        false
      )
      approvalFormSubmission = (result.submission as unknown) as ApprovalFormSubmission;

      if (approvalFormSubmission) {
        if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("approvalFormSubmission", approvalFormSubmission);  
      }
      
    } else {
      throw Boom.badData(`approvalFormId (${approvalFormId}) or approvalFormSubmissionId (${approvalFormSubmissionId}) is undefined`)
    }

    let formSubmissionApproval 
    if (approvalId) {
      formSubmissionApproval =
      await approvalsSDK.getFormSubmissionApproval(
        approvalId
      )
    } else {
      throw Boom.badData(`approvalId (${approvalId}) is undefined`)
    }
    if (Logs.LogLevel <= Logs.LogLevelEnum.error)  console.log("formSubmissionApproval", formSubmissionApproval);

  } else {
    console.error('formSubmissionApprovals is undefined');
  }

  let result: ApprovalFormData
  if (approvalFormSubmission && formApprovalFlowInstance){
    result = {
      approvalFormSubmission, 
      formApprovalFlowInstance,
      approvalFormSubmissionId,
      approvalFormId
    };
  } else {
    throw new Error("approvalFormSubmission or formApprovalFlowInstance are not truthy and they both should be");
  }

  return result;
}