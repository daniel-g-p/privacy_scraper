import puppeteer from "puppeteer";
import XLSX from "xlsx";

import config from "./config.js";

const getHome = (req, res) => {
  return res.render("home");
};

const getListTemplate = (req, res) => {
  const filePath = config.dirname + "/files/list-template.xlsx";
  return res.sendFile(filePath);
};

const postList = (req, res) => {
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
  return res.render("preview", { items: data });
};

const postStart = async (req, res) => {
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
  const browser = await puppeteer
    .launch({ headless: true })
    .then((browser) => browser.createIncognitoBrowserContext());
  const page = await browser.newPage();

  const data = [];

  for (const company of companies) {
    try {
      await page.goto(company.website);

      const domain = page
        .url()
        .replace("https://www.", "")
        .replace("http://www.", "")
        .replace("https://", "")
        .replace("http://", "")
        .split("/")[0];

      const cookies = await page.cookies().then((cookies) => {
        return cookies.map((cookie) => {
          return { name: cookie.name.trim(), domain: cookie.domain.trim() };
        });
      });

      const privacyUrls = [];
      const links = await page.$$("a");
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

      const privacyOutput = privacyUrls.length
        ? []
        : [
            {
              url: company.website,
              alerts: ["Didn't find any privacy-related URLs"],
            },
          ];
      if (privacyOutput.length === 0) {
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
                return "Found " + item.label + " on " + url;
              });
            const expectedNotFound = config.expectedPrivacyKeywords
              .filter((item) => {
                return item.keywords.every((keyword) => {
                  return !text.includes(keyword);
                });
              })
              .map((item) => {
                return "Didn't find " + item.label + " on " + url;
              });
            const alerts = [...flaggedFound, ...expectedNotFound];
            if (alerts.length) {
              privacyOutput.push({ url, alerts });
            }
          }
        }
      }

      const cookieOutput = [];
      for (const cookie of cookies) {
        const isThirdParty = !cookie.domain.includes(domain);
        const navigationOk = await page
          .goto("https://cookiedatabase.org/?s=" + cookie.name)
          .then(() => true)
          .catch(() => false);
        if (navigationOk) {
          const cookiesInformation = [];
          const searchResults = await page.$$("article.elementor-post");
          for (const result of searchResults) {
            const h3 = await result.$("h3");
            const name = h3
              ? await h3
                  .evaluate((el) => el.textContent)
                  .then((res) => {
                    return res && typeof res === "string" ? res.trim() : "";
                  })
                  .catch(() => "")
              : "";
            const a = await result.$("a");
            const url = a
              ? await a
                  .evaluate((el) => el.getAttribute("href"))
                  .then((res) => {
                    return res && config.urlRegex.test(res) ? res : "";
                  })
                  .catch(() => "")
              : "";
            if (name && url) {
              cookiesInformation.push({ name, url });
            }
          }
          const otherPages = await page.$$("nav.elementor-pagination > a");
          const otherPageUrls = [];
          for (const otherPage of otherPages) {
            const url = await otherPage
              .evaluate((el) => el.getAttribute("href"))
              .then((res) => {
                return res && config.urlRegex.test(res) ? res : "";
              })
              .catch(() => "");
            if (url) {
              otherPageUrls.push(url);
            }
          }
          for (const url of otherPageUrls) {
            const navigationOk = await page
              .goto(url)
              .then(() => true)
              .catch(() => false);
            if (navigationOk) {
              const searchResults = await page.$$("article.elementor-post");
              for (const result of searchResults) {
                const h3 = await result.$("h3");
                const name = h3
                  ? await h3
                      .evaluate((el) => el.textContent)
                      .then((res) => {
                        return res && typeof res === "string" ? res.trim() : "";
                      })
                      .catch(() => "")
                  : "";
                const a = await result.$("a");
                const url = a
                  ? await a
                      .evaluate((el) => el.getAttribute("href"))
                      .then((res) => {
                        return res && config.urlRegex.test(res) ? res : "";
                      })
                      .catch(() => "")
                  : "";
                if (name && url) {
                  cookiesInformation.push({ name, url });
                }
              }
            }
          }
          const match = cookiesInformation.find((item) => {
            return item.name.trim().toLowerCase() ===
              cookie.name.trim().toLowerCase()
              ? true
              : false;
          });
          if (match) {
            const navigationOk = await page
              .goto(match.url)
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
              const service = text
                .split("by:")[1]
                .split("functionality is:")[0]
                .trim()
                .split("\n")[0];
              const purpose = text
                .split("functionality is:")[1]
                .split("purpose is:")[0]
                .trim()
                .split("\n")[0];
              const category = text
                .split("purpose is:")[1]
                .split("Expiration period:")[0]
                .trim()
                .split("\n")[0];
              cookieOutput.push({
                name: cookie.name,
                domain: cookie.domain,
                isThirdParty,
                service,
                purpose,
                category,
              });
            } else {
              cookieOutput.push({
                name: cookie.name,
                domain: cookie.domain,
                isThirdParty,
                service: "",
                purpose: "",
                category: "",
              });
            }
          }
        }
      }

      data.push({
        id: company.id,
        name: company.name,
        website: company.website,
        privacy: privacyOutput,
        cookies: cookieOutput,
      });
    } catch (error) {
      console.log(error);
    }
  }

  console.log(data)

//   const book = XLSX.utils.book_new();
//   const columns = ["Company", "Website", "Alert"];
//   const rows = [];
//   for (const company of data) {
//     for (const privacyItem of company.privacy) {
//       for (const privacyAlert of privacyItem.alerts) {
//         rows.push({
//           id: company.id,
//           name: company.name,
//           website: company.website,
//           alert: privacyAlert,
//         });
//       }
//     }
//     for (const cookieItem of company.cookies) {
//         for (const cookie of cookieItem)
//     }
//     const privacyAlerts = item.privacy;
//     const rows = data.map((dataItem) => {
//       return [...dataItem.privacy.map((privacyItem) => privacy)];
//     });
//   }
//   const sheet = XLSX.utils.aoa_to_sheet(data);
};

export default { getHome, getListTemplate, postList, postStart };
