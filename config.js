import { config } from "dotenv";

config();

export default {
  port: process.env.PORT,
  privacy_policy_link_keywords: ["privacy", "datenschutz"],
  flagged_cookie_names: ["_ga"],
  flagged_privacy_policy_keywords: [
    { label: "Google Analytics", keywords: ["Google Analytics"] },
    { label: "Google Fonts", keywords: ["Google Fonts"] },
    { label: "Privacy Shield", keywords: ["Privacy Shield"] },
  ],
  expected_privacy_policy_keywords: [
    {
      label: "DPO",
      keywords: [
        "Datenschutzbeauftragter",
        "Datenschutzbeauftragte",
        "Data Privacy Officer",
        "Data Protection Officer",
      ],
    },
  ],
};
