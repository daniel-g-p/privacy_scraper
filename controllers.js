import puppeteer from "puppeteer";
import xlsx from "xlsx";

import config from "./config.js";
import prompt from "./modules/prompt.js";
import validateUrl from "./modules/validate-url.js";

const init = async () => {
  // 1. Prompt for company details
  const companyName = await prompt("Company Name:");
  const websiteUrl = await prompt("Website URL:").then((input) => {
    return typeof input === "string" ? input.toLowerCase() : "";
  });

  // 2. Check if website URL is valid
  if (!validateUrl(websiteUrl)) {
    console.error("Invalid Website URL");
    return;
  }

  // 3. Open website URL
  const browser = await puppeteer
    .launch({ headless: false })
    .then((browser) => browser.createIncognitoBrowserContext());
  const page = await browser.newPage();
  await page.goto(websiteUrl);

  // 4. Gather cookie data
  const websiteDomain = page
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

  // 5. Parse website for privacy-related URLs
  const privacyUrls = [];
  const aElements = await page.$$("a");
  for (const aElement of aElements) {
    const href = await aElement.evaluate((el) => el.getAttribute("href"));
    const hrefTrimmed =
      typeof href === "string"
        ? href.split("?")[0].split("#")[0].toLowerCase().trim()
        : "";
    const hrefValidated = validateUrl(hrefTrimmed)
      ? hrefTrimmed
      : websiteUrl + hrefTrimmed.replace(websiteUrl, "");
    const hasKeyword = config.privacy_policy_link_keywords.some((keyword) => {
      return hrefValidated.includes(keyword);
    });
    if (hasKeyword && !privacyUrls.includes(hrefValidated)) {
      privacyUrls.push(hrefValidated);
    }
  }

  // 6. Check privacy-related URLs for flags
  const scrapingOutput = privacyUrls.length ? [] : null;
  for (const url of privacyUrls) {
    try {
      const urlOk = await page
        .goto(url)
        .then(() => true)
        .catch(() => false);
      if (urlOk) {
        const body = await page.$("body");
        const text = await body.evaluate((el) => el.innerText);
        const flaggedFound = config.flagged_privacy_policy_keywords
          .filter((item) => {
            return item.keywords.some((keyword) => text.includes(keyword));
          })
          .map((item) => {
            return "Found " + item.label + " on " + url;
          });
        const expectedNotFound = config.expected_privacy_policy_keywords
          .filter((item) => {
            return item.keywords.every((keyword) => !text.includes(keyword));
          })
          .map((item) => {
            return "Could not find " + item.label + " on " + url;
          });
        const alerts = [...flaggedFound, ...expectedNotFound];
        if (alerts.length) {
          scrapingOutput.push({ url, alerts });
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  // 7. Check cookies for flags
  const cookieOutput = [];
  for (const cookie of cookies) {
    try {
      const isThirdParty = !cookie.domain.includes(websiteDomain);
      await page.goto("https://cookiedatabase.org/?s=" + cookie.name);
      // 7.1. Gather search results for cookie name
      const results = [];
      const searchResults = await page.$$("article.elementor-post");
      for (const result of searchResults) {
        const h3 = await result.$("h3");
        const h3Text = await h3.evaluate((el) => el.innerText);
        const a = await result.$("a");
        const aHref = await a.evaluate((el) => el.getAttribute("href"));
        results.push({ name: h3Text, url: aHref });
      }
      const otherPages = await page.$$("nav.elementor-pagination > a");
      const otherPagesUrls = [];
      for (const otherPage of otherPages) {
        const url = await otherPage.evaluate((el) => el.getAttribute("href"));
        otherPagesUrls.push(url);
      }
      for (const url of otherPagesUrls) {
        await page.goto(url);
        const otherSearchResults = await page.$$("article.elementor-post");
        for (const result of otherSearchResults) {
          const h3 = await result.$("h3");
          const h3Text = await h3.evaluate((el) => el.innerText);
          const a = await result.$("a");
          const aHref = await a.evaluate((el) => el.getAttribute("href"));
          results.push({ name: h3Text, url: aHref });
        }
      }
      // 7.2. Search for search result matching the cookie name
      const match = results.find((result) => {
        return result.name.trim().toLowerCase() ===
          cookie.name.trim().toLowerCase()
          ? true
          : false;
      });
      if (match) {
        await page.goto(match.url);
        const body = await page.$("body");
        const text = await body.evaluate((el) => el.innerText);
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
    } catch (error) {
      console.log(error);
    }
  }

  console.log(scrapingOutput);
  console.log(cookieOutput);

  const checkPrivacy = scrapingOutput.length > 0 ? true : false;
  const checkCookies = cookieOutput.some((cookie) => {
    return cookie.isThirdParty || !["", "Functional"].includes(cookie.category)
      ? true
      : false;
  });

  const columns = [
    "Company",
    "Website",
    "Privacy Status",
    "Cookie Status",
    "Privacy Report",
    "Cookie Report",
  ];
  const aoa = [
    companyName,
    websiteUrl,
    checkPrivacy ? "Check" : "OK",
    checkCookies ? "Check" : "OK",
    scrapingOutput
      .reduce((result, item) => {
        result.push(...item.alerts);
        return result;
      }, [])
      .join(" ///// "),
    cookieOutput
      .map((item) => {
        return (
          `${item.name ? "Name: " + item.name : "Name: NA"}` +
          " / " +
          `${item.domain ? "Domain: " + item.domain : "Domain: NA"}` +
          " / " +
          `${item.category ? "Category: " + item.category : "Category: NA"}` +
          " / " +
          `${item.service ? "Service: " + item.service : "Service: NA"}` +
          " / " +
          `${item.purpose ? "Purpose: " + item.purpose : "Purpose: NA"}`
        );
      })
      .join(" ///// "),
  ];

  const filename = "webscraping-report-" + Date.now() + ".xlsx";
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.aoa_to_sheet([columns, aoa]);
  xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  xlsx.writeFileXLSX(workbook, "./output/" + filename);

  process.exit();
  // 7.

  // const cookies = await page.cookies();
  // DSE nicht gefunden, "Datenschutzbeauftragte/r" nicht gefunden, "Google Analytics" gefunden, "Google Fonts" gefunden, Cookies automatisch angeschaltet,
};

init();
