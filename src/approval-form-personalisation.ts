"use strict";

import OneBlink from "@oneblink/sdk"
import * as OneBlinkHelpers from "./BfsLibrary/oneblinkSdkHelpers.mjs"
import * as ProjectTypes from "./projectTypes.js"

import * as Logs from "./BfsLibrary/logs.mjs"


const approvalsSDK = new OneBlink.Approvals({
  accessKey: process.env.FORMS_ACCESS_KEY!,
  secretKey: process.env.FORMS_SECRET_KEY!,
})

interface Request {
  body: {
      formsAppId: number,
      formId: number,
      externalIdUrlSearchParam: string,
      previousFormSubmissionApprovalId: string
  } 
}

interface Personalisation {
  submission: {
    trackingCodeApprovalCopy: string,
    FormOpenInApprovalContext: boolean,
    PersonResponsibleName: string,
    PersonResponsibleEmail: string,
    IsInspectorFillingRom: string,
    InspectorFillingRom: string,
    Carriers: ProjectTypes.Carrier[]
  }
}

export let post = async function webhook(req: Request, res: object) {
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("approval-form-personalisation start");
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Validating webhook request payload");
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("req", req);

  let personalisation: Personalisation = {
    submission: {
      trackingCodeApprovalCopy: "",
      FormOpenInApprovalContext: false,
      PersonResponsibleName: "",
      PersonResponsibleEmail: "",
      IsInspectorFillingRom: "",
      InspectorFillingRom: "",      
      Carriers: []
    }
  }
  
  if (req.body &&
      req.body.formsAppId &&
      req.body.formId &&
      req.body.previousFormSubmissionApprovalId) {

    const formSubmissionApproval =
    await approvalsSDK.getFormSubmissionApproval(
      req.body.previousFormSubmissionApprovalId
    )

    // console.log("formSubmissionApproval", formSubmissionApproval)

    const baseFormFormId = formSubmissionApproval.formSubmissionMeta.formId
    const baseFormSubmissionId = formSubmissionApproval.formSubmissionMeta.submissionId
    const baseFormIsDraft = false;
    
    const baseFormSubmission: ProjectTypes.BaseFormSubmissionProjectSpecific = await OneBlinkHelpers.getBaseFormSubmission(baseFormFormId,
                          baseFormSubmissionId,
                          baseFormIsDraft) as ProjectTypes.BaseFormSubmissionProjectSpecific;
    // console.log('baseFormSubmission ZZZ', baseFormSubmission);

    personalisation = {
      "submission": {
        trackingCodeApprovalCopy: baseFormSubmission.trackingCode,
        FormOpenInApprovalContext: true,
        PersonResponsibleName: baseFormSubmission.PersonResponsibleFirstName + " " + baseFormSubmission.PersonResponsibleLastName,
        PersonResponsibleEmail:  baseFormSubmission.PersonResponsibleEmail,
        IsInspectorFillingRom: baseFormSubmission.IsInspectorFillingRom,
        InspectorFillingRom: baseFormSubmission.InspectorFillingRom,        
        Carriers: baseFormSubmission.Carriers
      }
    }
    // Option sets, as with CarrierType, don't set with brackets () in the values.
    // So we use hyphens instead. e.g.  `CarrierType: 'Comb trailer - including comb or front'`
    // console.log("baseFormSubmission.Carriers", baseFormSubmission.Carriers);
  } else  {
    console.log("Invalid webhook request payload. We are probably opening the inspection form without a base form context. E.g. when opening the form directly from the console", req);
  }

  // console.log("personalisation ZZZ plain", personalisation);

  // JSON.stringify otherwise the nested carriers array of objects won't display.
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("personalisation JSON.stringify", JSON.stringify(personalisation, null, 2));
  if (Logs.LogLevel <= Logs.LogLevelEnum.error) console.log("Webhook completed successfully");
  return personalisation
}
