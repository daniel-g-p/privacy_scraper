import crypto from "crypto";
import fs from "fs";
import puppeteer, { BrowserContext } from "puppeteer";
import XLSX from "xlsx";

import config from "./config.js";

const getHome = (req, res, next) => {
  try {
    return res.render("home");
  } catch (error) {
    next(error);
  }
};

const getList = (req, res, next) => {
  try {
    const filePath = config.dirname + "/files/privacy_scan_template.xlsx";
    return res.download(filePath, "privacy_scan_template.xlsx");
  } catch (error) {
    next(error);
  }
};

const postList = (req, res, next) => {
  try {
    const book = XLSX.read(req.file.buffer);
    const sheet = book.Sheets[book.SheetNames[0]];
    const js = XLSX.utils.sheet_to_json(sheet);
    const data = js
      .filter((item) => {
        return item["Company Name"] &&
          item["Company Website"] &&
          config.urlRegex.test(item["Company Website"])
          ? true
          : false;
      })
      .map((item, index) => {
        return {
          id: index + 1,
          name: item["Company Name"],
          website: item["Company Website"],
        };
      });
    if (data.length) {
      return res.render("preview", { items: data });
    } else {
      throw new Error(400);
    }
  } catch (error) {
    next(error);
  }
};

const postScan = async (req, res, next) => {
  try {
    const companies = req.body.filter((item) => {
      return item &&
        item.id &&
        typeof item.id === "string" &&
        item.name &&
        typeof item.name === "string" &&
        item.website &&
        typeof item.website === "string" &&
        config.urlRegex.test(item.website)
        ? true
        : false;
    });

    if (!companies.length) {
      throw new Error(400);
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    const browserContext = await browser.createIncognitoBrowserContext();
    const page = await browserContext.newPage();

    const data = [];

    for (const company of companies) {
      const navigationOk = await page
        .goto(company.website)
        .then(() => true)
        .catch(() => false);

      const domain = page
        .url()
        .replace("https://www.", "")
        .replace("http://www.", "")
        .replace("https://", "")
        .replace("http://", "")
        .split("/")[0];

      const cookies = await page
        .cookies()
        .then((cookies) => {
          return cookies.map((cookie) => {
            return { name: cookie.name.trim(), domain: cookie.domain.trim() };
          });
        })
        .catch(() => []);

      const privacyUrls = [];
      const links = navigationOk ? await page.$$("a") : [];
      for (const link of links) {
        const href = await link
          .evaluate((el) => el.getAttribute("href"))
          .then((res) => {
            return res && typeof res === "string"
              ? res.split("?")[0].split("#")[0].trim()
              : "";
          })
          .then((res) => {
            return config.urlRegex.test(res)
              ? res
              : company.website + res.replace(company.website, "");
          })
          .catch(() => "");
        const hasKeyword = config.privacyUrlKeywords.some((keyword) => {
          return href.includes(keyword);
        });
        if (hasKeyword && !privacyUrls.includes(href)) {
          privacyUrls.push(href);
        }
      }

      const companyAlerts = privacyUrls.length
        ? []
        : ["Didn't find any privacy-related URLs on " + company.website];

      if (companyAlerts.length === 0) {
        for (const url of privacyUrls) {
          const navigationOk = await page
            .goto(url)
            .then(() => true)
            .catch(() => false);
          if (navigationOk) {
            const body = await page.$("body");
            const text = body
              ? await body
                  .evaluate((el) => el.textContent)
                  .then((res) => {
                    return res && typeof res === "string" ? res : "";
                  })
                  .catch(() => "")
              : "";
            const flaggedFound = config.flaggedPrivacyKeywords
              .filter((item) => {
                return item.keywords.some((keyword) => text.includes(keyword));
              })
              .map((item) => {
                return "Found " + item.name + " on " + url;
              });
            const expectedNotFound = config.expectedPrivacyKeywords
              .filter((item) => {
                return item.keywords.every((keyword) => {
                  return !text.includes(keyword);
                });
              })
              .map((item) => {
                return "Didn't find " + item.name + " on " + url;
              });
            const alerts = [...flaggedFound, ...expectedNotFound];
            for (const alert of alerts) {
              companyAlerts.push(alert);
            }
          }
        }
      }

      for (const cookie of cookies) {
        const isThirdParty = !cookie.domain.includes(domain);
        const alert =
          'Automatic cookie "' +
          cookie.name +
          '" from domain "' +
          cookie.domain +
          `"` +
          (isThirdParty ? " (3rd party)" + "" : "");
        companyAlerts.push(alert);
      }

      data.push({
        id: company.id,
        name: company.name,
        website: company.website,
        alerts: companyAlerts,
      });
    }

    await browserContext.close();
    await browser.close();

    const book = XLSX.utils.book_new();
    const columns = ["ID", "Company", "Website", "Alerts"];
    const rows = data.map((item) => {
      return [item.id, item.name, item.website, item.alerts.join(", ")];
    });
    const sheet = XLSX.utils.aoa_to_sheet([columns, ...rows]);
    XLSX.utils.book_append_sheet(book, sheet, "Sheet1");

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const hour = today.getHours();
    const minute = today.getMinutes();

    const yearText = year.toString();
    const monthText = month < 10 ? "0" + month : month.toString();
    const dayText = day < 10 ? "0" + day : day.toString();
    const hourText = hour < 10 ? "0" + hour : hour.toString();
    const minuteText = minute < 10 ? "0" + minute : minute.toString();
    const hash = crypto.randomBytes(2).toString("hex");

    const filename =
      "privacy_scan-" +
      yearText +
      monthText +
      dayText +
      "-" +
      hourText +
      minuteText +
      "-" +
      hash;
    const filepath = config.dirname + "/output/" + filename + ".xlsx";
    XLSX.writeFile(book, filepath);

    return res.status(200).json({ filename });
  } catch (error) {
    next(error);
  }
};

const getOutput = (req, res, next) => {
  try {
    const { filename } = req.params;
    const filepath = config.dirname + "/output/" + filename + ".xlsx";
    return res.sendFile(filepath, () => {
      fs.unlink(filepath, (error) => {
        if (error) {
          next(error);
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getHome,
  getList,
  postList,
  postScan,
  getOutput,
};
