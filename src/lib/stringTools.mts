/**
 * Source: "John Bentley's \OneDrive - DPIE\Documents\Sda\Code\Typescript\library\"
 * Warning: Don't edit outside of that location.
 * Author: John Bentley
 */

// parse first.last@example.com into a string "First Last".
export function parseEmailToName(email: string) {
  const [localPart] = email.split('@');  // Extract the local part of the email
  const [first, last] = localPart.split('.');  // Split the local part into first and last
  
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();  // Capitalize the first letter
  
  return `${capitalize(first)} ${capitalize(last)}`;  // Return the formatted name
}