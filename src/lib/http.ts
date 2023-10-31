/**
 * Source: "John Bentley's \OneDrive - DPIE\Documents\Sda\Code\Typescript\library\"
 * Warning: Don't edit outside of that location.
 * Author: John Bentley
 */
import fetch, { RequestInit } from 'node-fetch'
import Boom from '@hapi/boom'

export type DatabaseResponse = {
  body: string
  statusCode: number
}

interface ErrorResult {
  Result_error: string
  Result: string
}

export async function sendRequest(
  url: string,
  options?: RequestInit,
): Promise<DatabaseResponse> {

  console.log(`Requesting ${JSON.stringify({ url, ...options }, null, 2)}`)

  const resp = await fetch(url, options)

  const statusCode = resp.status
  console.log(`status code: ${statusCode}`)
  
  const bodyText = await resp.text()
  console.log(`${statusCode} response from Database: ${bodyText}`)

  if (!resp.ok) {
    let errorText = bodyText
    try {
      const json = JSON.parse(bodyText) as ErrorResult
      if (json.Result_error) {
        errorText = json.Result_error
      }
    } catch (e) {
      // do nothing
    }
    console.error(`Error from Database: ${errorText}`)
    throw new Boom.Boom(errorText, { statusCode })
  }

  const returnPacket: DatabaseResponse = { body: bodyText, statusCode }
  console.log("returnPacket", returnPacket)
  return returnPacket
  
}