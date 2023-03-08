import { config } from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

config();

export default {
  dirname: dirname(fileURLToPath(import.meta.url)),
  port: process.env.PORT,
  urlRegex:
    /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/,

  privacyUrlKeywords: ["privacy", "datenschutz"],
  flaggedPrivacyKeywords: [
    { name: "Google Analytics", keywords: ["Google Analytics"] },
    { name: "Google Fonts", keywords: ["Google Fonts"] },
    { name: "Privacy Shield", keywords: ["Privacy Shield"] },
  ],
  expectedPrivacyKeywords: [
    {
      name: "DPO",
      keywords: [
        "Datenschutzbeauftragter",
        "Datenschutzbeauftragte",
        "Data Privacy Officer",
        "Data Protection Officer",
      ],
    },
  ],
};
