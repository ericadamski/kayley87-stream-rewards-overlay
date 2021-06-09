import pino from "pino";
import { createPinoBrowserSend, createWriteStream } from "pino-logflare";

let logger: pino.Logger | Console = console;

const apiKey = process.env.NEXT_PUBLIC_LOGFLARE_API_KEY!;
const sourceToken = process.env.NEXT_PUBLIC_LOGFLARE_SOURCE!;

function getLogger() {
  if (process.env.NODE_ENV !== "development") {
    if (logger === console) {
      logger = pino(
        {
          browser: {
            transmit: {
              // @ts-ignore
              send: createPinoBrowserSend({
                apiKey,
                sourceToken,
              }),
            },
          },
        },
        createWriteStream({
          apiKey,
          sourceToken,
        })
      );
    }
  }

  return logger;
}

export const Remote = { log: getLogger().log };
