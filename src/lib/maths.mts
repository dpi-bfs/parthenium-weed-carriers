/**
 * Source: "John Bentley's \OneDrive - DPIE\Documents\Sda\Code\Typescript\library\"
 * Warning: Don't edit outside of that location.
 * Author: John Bentley
 */

export function generateExternalId(charLength = 8) {
  /** 
   * Full alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
   * See "Avoiding Confusion With Alphanumeric Characters" https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3541865/
   * Look alikes removed: 
   *  - Z2
   *  - O0
   *  - B8
   *  - S5
   *  - LI
   **/ 
  const chars = 'ACDEFGHJKMNPQRTUVWXY34679'; 
  let code = '';

  for (let i = 0; i < charLength; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }

  return code;
}
