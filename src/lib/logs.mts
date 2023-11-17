// import * as Logs from "./lib/logs.mjs"

// From more detailed, to less. debug is most detailed
// To remove Privacy Exposing data from logs set log level to something above
// privacy exposing
export enum LogLevelEnum {
  privacyExposing, 
  info,
  error
}

export var LogLevel: LogLevelEnum = LogLevelEnum.error

// In Prod we want to ensure no private/sensitive information leaks into the logs;
// While retaining useful information in the logs.
function setLoggingLevel() {
  
  switch(process.env.ONEBLINK_ENVIRONMENT) {
    case "local":
    case "dev":
    case "test":
      LogLevel = LogLevelEnum.privacyExposing
      break;
    case "train":
    case "prod":
      // LogLevel = LogLevelEnum.privacyExposing
      LogLevel = LogLevelEnum.error
      break;
    default:
      throw new Error("Unexpected case reached in switch process.env.ONEBLINK_ENVIRONMENT: " + process.env.ONEBLINK_ENVIRONMENT);
  }
  console.log("setLoggingLevel to: " + LogLevel)
}

setLoggingLevel();

