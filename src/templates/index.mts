import fs from "fs";
import util from "util";
import path from "path";
import Mustache from "mustache";
import juice from "juice";

// https://stackoverflow.com/a/62892482/872154
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readFileAsync = util.promisify(fs.readFile);

async function generateHtml(params: Record<string, any>, templateName: string) {
  const html = await readFileAsync(path.join(__dirname, templateName), "utf8");
 
  const renderedHtml = await Mustache.render(html, params);

  return juice(renderedHtml);
}

export let generateEmailUserHtml = (params: Record<string, any>) => generateHtml(params, "emailUserPlain.mustache");
export let generateEmailBusinessHtml = (params: Record<string, any>) => generateHtml(params, "emailBusinessPlain.mustache");
export let generatePdfHtmlBiosecurityCertificate = (params: Record<string, any>) => generateHtml(params, "pdfBiosecurityCertificate.mustache");
export let generatePdfHtmlTaxInvoice = (params: Record<string, any>) => generateHtml(params, "pdfTaxInvoice.mustache");

