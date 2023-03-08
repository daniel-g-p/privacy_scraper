import cron from "cron";
import fs from "fs";

import config from "./config.js";

export default () => {
  const job = new cron.CronJob("0 */1 * * *", () => {
    fs.readdir(config.dirname + "/output", (error, files) => {
      for (const file of files) {
        const split = file.split("-");
        const date = split[1];
        const time = split[2];
        const year = date ? +date.slice(0, 4) : null;
        const month = date ? +date.slice(4, 6) : null;
        const day = date ? +date.slice(6, 8) : null;
        const hour = time ? +time.slice(0, 2) : null;
        const minute = time ? +time.slice(2, 4) : null;
        const isValid = [year, month, day, hour, minute].every((component) => {
          return typeof component === "number";
        });
        const fileTimestamp = isValid
          ? new Date(year, month - 1, day, hour, minute).getTime()
          : null;
        const deleteFile =
          !fileTimestamp || fileTimestamp < Date.now() - 1000 * 60 * 60
            ? true
            : false;
        if (deleteFile) {
          const filepath = config.dirname + "/output/" + file;
          fs.unlink(filepath, () => {});
        }
      }
    });
  });

  job.start();
};
