/**
 * Source: "John Bentley's \OneDrive - DPIE\Documents\Sda\Code\Typescript\library\"
 * Warning: Don't edit outside of that location.
 * Author: John Bentley
 */

import { DateTime as LuxonDateTime } from 'luxon';
import moment from 'moment-timezone';

type TimeZoneType = {
  timeZoneName: string | undefined,
  offset: string
}

function getTimeZoneInfo(date: Date): TimeZoneType {
  const timezoneOffset = date.getTimezoneOffset();
  const timezoneOffsetSign = timezoneOffset > 0 ? '-' : '+';
  const timezoneOffsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
  const timezoneOffsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');
  
  const fullTimeZoneName = new Intl.DateTimeFormat(undefined, {
      timeZoneName: 'short'
  }).format(date);
  
  // Using regex to extract "AEST" or "AEDT"
  const regex = /(AEST|AEDT)/;
  const match = fullTimeZoneName.match(regex);
  const timeZoneName = match ? match[0] : undefined;

  const offset = `${timezoneOffsetSign}${timezoneOffsetHours}:${timezoneOffsetMinutes}`;

  const timeZoneInfo: TimeZoneType = { timeZoneName, offset}

  return timeZoneInfo
}

export function getLocalAsIso8601Like(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeZoneInfo = getTimeZoneInfo(date)

  return `${year}-${month}-${day} ${hours}:${minutes} ${timeZoneInfo.offset} ${timeZoneInfo.timeZoneName}`;
}

export function getNswDateTimeAsAustralianGovernmentTextualStyle(date: Date) {
  const formattedDate = new Intl.DateTimeFormat('en-au', {
    day: "2-digit", 
    month: "short", 
    year: "numeric", 
    hour: "numeric", 
    minute: "2-digit", 
    hourCycle: "h12",
    timeZone: "Australia/Sydney",
    timeZoneName: "short" 
  }).format(date);

  // Extracting individual parts of the formatted string.
  const parts = formattedDate.match(/(\d{2}) (\w{3,4}) (\d{4}), (\d{1,2})(:\d{2}) (am|pm) ([A-Z]{3,4})/);
  
  // If the format doesn't match the expected pattern, just return the original formatted date.
  if (!parts) {
    return formattedDate
  } else {
    // Reassemble the string ensuring the month abbreviation has a 3-character maximum.
    return `${parts[1]} ${parts[2].slice(0, 3)} ${parts[3]}, ${String(parts[4]).padStart(2, ' ')}${parts[5]} ${parts[6]} ${parts[7]}`;
  }
}

export enum PrecisionEnum {
  millisecond,
  second,
  minute
}
export function getUtcAsIso8601(date: Date, precision: PrecisionEnum = PrecisionEnum.second): string {
  switch (precision) {
    case (PrecisionEnum.millisecond):
      // E.g. 2023-09-03 09:37:23.000Z  
      return date.toISOString().replace('T', ' ');
      break;

    case (PrecisionEnum.second):
      // E.g. 2023-09-03 09:37:23Z  
      return date.toISOString().replace('T', ' ').split('.')[0] + "Z";
      break;

    case (PrecisionEnum.minute):
      // E.g. 2023-09-03 09:37Z
      return date.toISOString().replace('T', ' ').split('.')[0].slice(0, -3) + "Z";
      break;

    default:
      throw new Error(`Unexpected precision: ${precision}`);
  }
}

export function formatDuration(seconds: number): string  {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

// Given something like "2023-04-17T00:00:00Z"
// We discard the zulu designation and assume the date part "2023-04-17"
// is a local day (we don't convert from Zulu)
export function getDatePartAsIfLocal(dateWithZeroTimeZulu: string): string {
  const day = dateWithZeroTimeZulu.substring(0,10)
  const formattedDate = new Intl.DateTimeFormat('en-au', {
    day: "2-digit", 
    month: "short", 
    year: "numeric",
    timeZone: "Australia/Sydney"
  }).format(new Date(day));

  // Extracting individual parts of the formatted string.
  const parts = formattedDate.match(/(\d{2}) (\w{3,4}) (\d{4})/);
  
  // If the format doesn't match the expected pattern, just return the original formatted date.
  if (!parts) {
    return formattedDate
  } else {
    // Reassemble the string ensuring the month abbreviation has a 3-character maximum.
    return `${parts[1]} ${parts[2].slice(0, 3)} ${parts[3]}`;
  }
}

// utcDateTime: "2023-07-14T20:00:00Z"
export function getCustomLocalDateTime(utcDateTime: string): string {
  let date = new Date(utcDateTime)
  const locale: Intl.LocalesArgument = 'en-Au';
  const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {timeZone: 'Australia/Sydney'};
  let localDate = date.toLocaleDateString(locale, dateTimeFormatOptions);
  // let localTime = date.toLocaleTimeString(locale, dateTimeFormatOptions); 
  return `${localDate}`;
}

/**
 * utcLikeDateTime:
 *   - 2023-02-17T21:39:50Z; or
 *   - 2023-02-17 08:39 +11:00 AEDT
 * Returns: 
 *     2023-02-17 
 */
export function getDateString(utcLikeDateTime: string): string {
  const match = utcLikeDateTime.match(/(?<day>\d{4}-\d{2}-\d{2})/);
  return match?.groups?.day ? match.groups.day : "";
}

/**
 * utcLikeDateTime:
 *   - 2023-02-17T21:39:50Z; or
 *   - 2023-02-17 08:39 +11:00 AEDT
 * Returns: 
 *     2023-02-17, Fri 
 */
export function getDateWithWeekdayString(utcLikeDateTime: string): string {
  const yearMonthDayString = getDateString(utcLikeDateTime)
  const date = new Date(yearMonthDayString);

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weekday = weekdays[date.getDay()];

  return `${yearMonthDayString}, ${weekday}`;
}

/**
 * 
 * @param isoLocal "2023-10-20T11:59"
 * @returns 20 Oct 2023 11:59 pm
 */
export function convertLocalIsoDateTimeStringToLocalCustomDateTimeString(isoLocal: string): string {
  // Parse the local ISO datetime string
  const date = new Date(isoLocal);

  const locale: Intl.LocalesArgument = 'en-AU';
  const dateTimeFormatOptions: Intl.DateTimeFormatOptions = 
  {
    timeZone: 'Australia/Sydney',
    day: "2-digit", 
    month: "short", 
    year: "numeric",
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: "short"
  };

  // Use Intl.DateTimeFormat to get the formatted date string for the given locale and options
  const formatter = new Intl.DateTimeFormat(locale, dateTimeFormatOptions);
  return formatter.format(date);
}

/**
 * 
 * @param isoString "2023-10-26T23:59:00.000"
 * @returns 20 Oct 2023 11:59 pm
 */
// export function formatDateToCustomLuxon(isoString: string) {
//   // Parse the ISO string into a DateTime object in the Australia/Sydney time zone
//   const dt = LuxonDateTime.fromISO(isoString, { zone: 'Australia/Sydney' });

//   const timeZoneAbbreviation = dt.toFormat('ZZZZ') // Returns something like GMT+11 due to Luxon bug
//   let timeZoneAbbreviationFixed = '';
//   switch (timeZoneAbbreviation) {
//     case 'GMT+11':
//       timeZoneAbbreviationFixed = 'AEDT'
//       break;
//     case 'GMT+10':
//       timeZoneAbbreviationFixed = 'AEST'
//       break;
//     default:
//       timeZoneAbbreviationFixed = timeZoneAbbreviation
//   }

//   const formattedDate = dt.toFormat('d LLL yyyy, h:mm a ') + timeZoneAbbreviationFixed;
//   return formattedDate;
// }

/**
 * 
 * @param isoString "2023-10-26T23:59:00.000"
 * @returns 20 Oct 2023 11:59 pm
 */
export function formatDateCustom(isoString: string, timezone: string = 'Australia/Sydney') {
  const dt = moment.tz(isoString, timezone);

  const formattedDate = dt.format('D MMM YYYY, h:mm a z');

  return formattedDate;
}

/**
 * 
 * @param isoDateString "2023-10-20"
 * @param daysToAdd 2
 * @returns "2023-10-22T23:59:00.000"
 */
export function addDaysToIsoDate(isoDateString: string, daysToAdd: number): string {
  const date = new Date(isoDateString);
  
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + daysToAdd);

  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JS
  const dd = date.getDate().toString().padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T23:59:00.000`;
}


export function test() {
  const date = new Date("2023-09-06 14:12"); 
  const date2 = new Date("2023-09-06 22:12"); 

  // console.log("dateTime.ts Testing  ..")
  console.log(`Given Date: ${date}`);
  console.log(`DateTime: Local; Format: Iso8601Like: ${getLocalAsIso8601Like(date)}`);
  console.log(`DateTime: NSW/Australian Eastern Time; Format: Australian Government Textual Style: ${getNswDateTimeAsAustralianGovernmentTextualStyle(date)}`)
  console.log(`DateTime: NSW/Australian Eastern Time; Format: Australian Government Textual Style: ${getNswDateTimeAsAustralianGovernmentTextualStyle(date2)}`)
  console.log(`DateTime: UTC; Format: Iso8601 millisecond: ${getUtcAsIso8601(date, PrecisionEnum.millisecond)}`);
  console.log(`DateTime: UTC; Format: Iso8601 second     : ${getUtcAsIso8601(date, PrecisionEnum.second)}`);
  console.log(`DateTime: UTC; Format: Iso8601 minute     : ${getUtcAsIso8601(date, PrecisionEnum.minute)}`);
  console.log (getDatePartAsIfLocal("2023-09-17T00:00:00Z"))
  
  const isoDateString = "2023-10-25T03:42:23.000Z"
  console.log(`Convert Iso local ${isoDateString} to Custom local:`, convertLocalIsoDateTimeStringToLocalCustomDateTimeString(isoDateString))

  console.log(`formatDate Iso local ${isoDateString} to Custom local`, formatDateCustom(isoDateString));

  const days = 1
  console.log(`Add ${days} days to ${isoDateString}: ` + convertLocalIsoDateTimeStringToLocalCustomDateTimeString(addDaysToIsoDate(isoDateString, days)))
}

// test();  
