/**
 * Source: "John Bentley's \OneDrive - DPIE\Documents\Sda\Code\Typescript\library\"
 * Warning: Don't edit outside of that location.
 * Author: John Bentley
 */

import formData from 'form-data'
import Mailgun from 'mailgun.js'

const mailgun = new Mailgun(formData)
const mailgunClient = mailgun.client({
  username: process.env.MAILGUN_USERNAME!,
  key: process.env.MAILGUN_API_SECRET_KEY!
})

export interface Attachment {
  data: Buffer
  filename: string
}

export interface Props {
  to: string | string[]
  subject: string
  html: string
  from?: string
  cc?: string
  attachments?: Attachment[]
}

interface MailgunSendingProps extends Props {
  ['o:testmode']?: 'yes'
  ['v:environment']: string,
  ['v:source']: string,
  attachment?: Array<{
    data: Buffer
    filename: string
  }>
}
 

export async function sendEmail(
  props: Props,
  environment: string,
  source: string,
  options?: { testmode?: boolean; internalEmail?: boolean },
) {
  const { to, from, cc, subject, html, attachments } = props

  const mailgunProps: MailgunSendingProps = {
    to: Array.isArray(to) ? to : [to],
    from,
    cc,
    subject,
    html,
    attachment: attachments,
    ['v:environment']: environment,
    ['v:source']: source
  }

  if (options?.testmode) {
    mailgunProps['o:testmode'] = 'yes'
    console.log('sending in test mode')
  }

  console.log(`sending email using mailgun to ${props.to}`)
  console.log('source (for mailgun)', source)

  const result = await mailgunClient.messages.create(process.env.MAILGUN_DOMAIN!, mailgunProps)
  console.log(result)

  return result
}