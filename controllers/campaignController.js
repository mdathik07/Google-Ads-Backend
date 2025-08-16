const OpenAI = require("openai").default || require("openai");
const ChatSession = require("../models/ChatSession");
const { GoogleAdsApi } = require("google-ads-api");
const { v4: uuidv4 } = require("uuid");

const token = process.env["OPENAI_API_KEY"];

// Google Ads API Credentials
const GOOGLE_ADS_CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID;
const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const GOOGLE_ADS_REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN;
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
const GOOGLE_ADS_LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

function getFutureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// // Initialize Google Ads API Client
// const client = new GoogleAdsApi({
//     client_id: "670804048437-usfuc98cucpe97aef972sq2buuh5j2v3.apps.googleusercontent.com",
//     client_secret: "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",
//     developer_token: "-hl8mPUrAJBCBuBJIQx7PQ",
// });

// const customer = client.Customer({
//     customer_id: "5583797764",
//     refresh_token: "1//04qXbkKw6AQpjCgYIARAAGAQSNwF-L9Irs-Tap97A2nAozlDmd6HRlxz7ZelV1C6Xl3-VYq9WX0csGQrLeUYHAIdOngbZa6wyNZE",
//     login_customer_id: "8778126293"
// });

// Generate Campaign Function (Existing)
exports.generateCampaign = async (req, res) => {
    const { sessionId } = req.body;

    try {
        // Retrieve chat history based on sessionId
        const chatSession = await ChatSession.findOne({ sessionId });
        if (!chatSession) {
            return res.status(404).json({ error: "Chat session not found" });
        }

        const conversationData = chatSession.conversation;

        // Create OpenAI client
        const client = new OpenAI({
            baseURL: "https://models.inference.ai.azure.com",
            apiKey: token,
        });

        // Build AI model request with conversation history.
        const messagesForAPI = [
            {
                role: "system",
                content:
                    "You are an AI marketing strategist tasked with generating a Google Ads campaign." +
                    "Analyze the conversation history and output ONLY a valid JSON object conforming to this schema:\n\n" +
                    "And Give short and perfect statements for the business as the Google Ads will give Too long error if exits the length required" + 
                    "If a required information not specified and give the word relevent to the business" +
                    "Strictly follow Google Ads content and keyword policies. Do NOT generate any ad copy, keywords, or text that could be flagged as inappropriate, discriminatory, shocking, or in violation of Google Ads policies. Avoid using language that targets or singles out groups in a way that could be considered discriminatory. If unsure, use neutral and inclusive language."+
                    `
                    the character limits for various fields are:
                    Headlines: Maximum of 30 characters each.

                    Descriptions: Maximum of 90 characters each.

                    Keywords: Maximum of 80 characters each.

                    Final URLs: Maximum of 2,047 characters
                    `+
                    `{
                        "campaignName":String or null
                        "businessName": string or null,
                        "websiteURL": string or null,
                        "businessType": string or null,
                        "targetDemographics": { "ageRange": string or null, "gender": string or null, "incomeLevel": string or null },
                        "geographicTargeting": { "locations": [string], "radius": number or null },
                        "interestsAndBehaviors": [string],
                        "campaignObjectives": [string],
                        "budget": { "daily": number or null, "monthly": number or null },
                        "biddingStrategy": string or null,
                        "keywords": [string],
                        "adCopy": { "headlines": [string], "descriptions": [string] },
                        "landingPageURLs": [string],
                        "conversionTracking": { "methods": [string], "setupStatus": string or null },
                        "adExtensions": { "siteLinks": [string], "callExtensions": [string], "locationExtensions": [string], "promotionExtensions": [string] },
                        "status": string
                    }\n\n` +"The number of headlnes and descriptions must be greater or equal to 3 each"+
                    "Respond with only the JSON object and nothing else."
            },
        ];

        // Append full conversation history
        conversationData.forEach((msg) => {
            messagesForAPI.push({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.message,
            });
        });

        // Call OpenAI API
        const response = await client.chat.completions.create({
            messages: messagesForAPI,
            model: "gpt-4o",
            temperature: 1,
            max_tokens: 4096,
            top_p: 1,
        });

        //console.log("Raw AI Response:", response.choices[0].message.content);

        // Extract and clean AI-generated response
        let responseText = response.choices[0].message.content.trim();
        const jsonStart = responseText.indexOf("{");
        const jsonEnd = responseText.lastIndexOf("}");

        if (jsonStart === -1 || jsonEnd === -1) {
            console.error("No valid JSON found in response:", responseText);
            return res.status(500).json({ error: "AI response did not contain valid JSON data." });
        }

        let jsonString = responseText.substring(jsonStart, jsonEnd + 1);
        let campaignData;
        try {
            campaignData = JSON.parse(jsonString);
        } catch (parseError) {
            console.error("Error parsing campaign JSON:", parseError.message);
            console.error("Raw AI response:", responseText);
            return res.status(500).json({ error: "Failed to parse campaign data from AI response." });
        }

        return res.json({ campaign: campaignData });
    } catch (err) {
        console.error("Error generating campaign:", err);
        return res.status(500).json({ error: "Error generating campaign" });
    }
};



// exports.launchCampaign = async (req, res) => {
//   try {
//     const client = new GoogleAdsApi({
//       client_id: "670804048437-usfuc98cucpe97aef972sq2buuh5j2v3.apps.googleusercontent.com",
//       client_secret: "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",
//       developer_token: "-hl8mPUrAJBCBuBJIQx7PQ",
//     });

//     const customer = client.Customer({
//       customer_id: "5583797764",
//       login_customer_id: "8778126293",
//       refresh_token: "1//04qXbkKw6AQpjCgYIARAAGAQSNwF-L9Irs-Tap97A2nAozlDmd6HRlxz7ZelV1C6Xl3-VYq9WX0csGQrLeUYHAIdOngbZa6wyNZE",
//     });

//     // STEP 1 — Create Budget
//     const budgetName = `Budget ${uuidv4()}`;
//     const budgetRes = await customer.campaignBudgets.create([
//       {
//         name: budgetName,
//         amount_micros: 1_000_000, // $1 daily in micros
//         delivery_method: "STANDARD",
//       },
//     ]);
//     const budgetResourceName = budgetRes.results[0].resource_name;
//     console.log(`✅ Budget created: ${budgetResourceName}`);

//     // STEP 2 — Create Campaign
//     const campaignName = `Campaign ${uuidv4()}`;
//     const campaignRes = await customer.campaigns.create([
//       {
//         name: campaignName,
//         advertising_channel_type: "SEARCH",
//         status: "PAUSED",
//         manual_cpc: {},
//         campaign_budget: budgetResourceName,
//         network_settings: {
//           target_google_search: true,
//           target_search_network: true,
//           target_partner_search_network: false,
//           target_content_network: true,
//         },
//         start_date: getFutureDate(1),
//         end_date: getFutureDate(30),
//         contains_eu_political_advertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
//       },
//     ]);
//     const campaignResourceName = campaignRes.results[0].resource_name;
//     console.log(`✅ Campaign created: ${campaignResourceName}`);

//     // STEP 3 — Create Ad Group
//     const adGroupRes = await customer.adGroups.create([
//       {
//         name: `Ad Group ${uuidv4()}`,
//         campaign: campaignResourceName,
//         status: "ENABLED",
//         type: "SEARCH_STANDARD",
//       },
//     ]);
//     const adGroupResourceName = adGroupRes.results[0].resource_name;
//     console.log(`✅ Ad group created: ${adGroupResourceName}`);

//     // STEP 4 — Create Responsive Search Ad
//     await customer.adGroupAds.create([
//       {
//         ad_group: adGroupResourceName,
//         status: "PAUSED",
//         ad: {
//           responsive_search_ad: {
//             headlines: [
//               { text: "Visit Mars Today!" },
//               { text: "Affordable Space Cruises" },
//               { text: "Book Your Tour" },
//             ],
//             descriptions: [
//               { text: "Explore the Red Planet adventure." },
//               { text: "Reserve your seat today!" },
//             ],
//           },
//           final_urls: ["https://www.example.com"],
//         },
//       },
//     ]);
//     console.log(`✅ Ad created for ad group: ${adGroupResourceName}`);

//     // STEP 5 — Add Keywords
//     const keywords = ["mars cruise", "space travel", "interplanetary tour"];
//     await customer.adGroupCriteria.create(
//       keywords.map((text) => ({
//         ad_group: adGroupResourceName,
//         status: "ENABLED",
//         keyword: { text, match_type: "EXACT" },
//       }))
//     );
//     console.log(`✅ Keywords added: ${keywords.join(", ")}`);

//     return res.json({
//       success: true,
//       budget: budgetResourceName,
//       campaign: campaignResourceName,
//       adGroup: adGroupResourceName,
//     });
//   } catch (err) {
//     if (err.errors) {
//       console.error("Google Ads API errors:", JSON.stringify(err.errors, null, 2));
//     }
//     console.error("❌ Error launching campaign:", err);
//     return res.status(500).json({ error: "Failed to launch campaign", details: err.message });
//   }
// };


exports.launchCampaign = async (req, res) => {
  console.log(req.body)
  try {
    // Helper: Normalize bidding strategy from frontend to Google Ads API
    function normalizeBiddingStrategy(strategy) {
      if (!strategy) return { manual_cpc: {} };
      const map = {
        "manual_cpc": { manual_cpc: {} },
        "Manual CPC": { manual_cpc: {} },
        // "Maximize conversions": { maximize_conversions: {} },
        // "Maximize Conversions": { maximize_conversions: {} },
        // "maximize_conversions": { maximize_conversions: {} },
        "Target CPA": { target_cpa: {} },
        "target_cpa": { target_cpa: {} },
        "Target ROAS": { target_roas: {} },
        "target_roas": { target_roas: {} },
      };
      return map[strategy] || { manual_cpc: {} };
    }

    // Helper: Normalize status
    function normalizeStatus(status) {
      if (!status) return "PAUSED";
      const s = status.toLowerCase();
      if (s === "active") return "ENABLED";
      if (s === "paused") return "PAUSED";
      return "PAUSED";
    }

    // Use frontend data as-is, only use defaults if field is undefined
    // Support both { ... } and { campaign: { ... } } formats
const data = req.body.campaign ? req.body.campaign : req.body;

// Now extract fields as before
const campaignName = data.campaignName !== undefined ? data.campaignName : `Campaign ${uuidv4()}`;
const websiteURL = data.websiteURL !== undefined ? data.websiteURL : "https://example.com";
const budget = data.budget !== undefined ? data.budget : { daily: 1 };
    // Always use manual_cpc bidding strategy (MNC)
    const biddingStrategy = { manual_cpc: {} };
const status = normalizeStatus(data.status);
const adCopy = data.adCopy !== undefined ? data.adCopy : { headlines: [], descriptions: [] };
const headlines = Array.isArray(adCopy.headlines) ? adCopy.headlines : [];
const descriptions = Array.isArray(adCopy.descriptions) ? adCopy.descriptions : [];
const keywords = Array.isArray(data.keywords) ? data.keywords : [];
const adExtensions = data.adExtensions && typeof data.adExtensions === 'object' ? data.adExtensions : {};
const siteLinks = Array.isArray(adExtensions.siteLinks) ? adExtensions.siteLinks : [];
    console.log("whgutyegdbhjengv");
    console.log(headlines);
    console.log(descriptions);
    const client = new GoogleAdsApi({
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
      developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
      customer_id: GOOGLE_ADS_CUSTOMER_ID,
      login_customer_id: GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
    });

    // 1️⃣ Create Budget
    const budgetRes = await customer.campaignBudgets.create([
      {
        name: `Budget ${uuidv4()}`,
        amount_micros: (budget.daily || 1) * 1_000_000,
        delivery_method: "STANDARD",
        explicitly_shared: false,
      },
    ]);
    const budgetResourceName = budgetRes.results[0].resource_name;
    console.log(`✅ Budget created: ${budgetResourceName}`);

    // 2️⃣ Create Campaign
    const campaignCreateObj = {
      name: campaignName,
      advertising_channel_type: "SEARCH",
      status: status,
      campaign_budget: budgetResourceName,
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_partner_search_network: false,
        target_content_network: true,
      },
      start_date: getFutureDate(1),
      end_date: getFutureDate(30),
      contains_eu_political_advertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      ...biddingStrategy,
    };
    const campaignRes = await customer.campaigns.create([campaignCreateObj]);
    const campaignResourceName = campaignRes.results[0].resource_name;
    console.log(`✅ Campaign created: ${campaignResourceName}`);

    // 3️⃣ Create Ad Group
    const adGroupRes = await customer.adGroups.create([
      {
        name: `Ad Group ${uuidv4()}`,
        campaign: campaignResourceName,
        status: "ENABLED",
        type: "SEARCH_STANDARD",
      },
    ]);
    const adGroupResourceName = adGroupRes.results[0].resource_name;
    console.log(`✅ Ad group created: ${adGroupResourceName}`);

    // 4️⃣ Create Responsive Search Ad
    await customer.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        status: "PAUSED",
        ad: {
          responsive_search_ad: {
            headlines: headlines.map(text => ({ text })),
            descriptions: descriptions.map(text => ({ text })),
          },
          final_urls: [websiteURL],
        },
      },
    ]);
    console.log(`✅ Ad created for ad group: ${adGroupResourceName}`);

    // 5️⃣ Add Keywords
    if (keywords.length) {
      await customer.adGroupCriteria.create(
        keywords.map(text => ({
          ad_group: adGroupResourceName,
          status: "ENABLED",
          keyword: { text, match_type: "EXACT" },
        }))
      );
      console.log(`✅ Keywords added: ${keywords.join(", ")}`);
    }

    // // 6️⃣ Add Sitelink Extensions (if any)
    // if (siteLinks.length) {
    //   await customer.extensions.sitelinks.create(
    //     siteLinks.map(text => ({
    //       campaign: campaignResourceName,
    //       sitelink_feed_item: {
    //         link_text: text,
    //         final_urls: [websiteURL],
    //       },
    //     }))
    //   );
    //   console.log(`✅ Sitelinks added: ${siteLinks.join(", ")}`);
    // }

    return res.json({
      success: true,
      budget: budgetResourceName,
      campaign: campaignResourceName,
      adGroup: adGroupResourceName,
    });
  } catch (err) {
    if (err.errors) {
      console.error("Google Ads API errors:", JSON.stringify(err.errors, null, 2));
    }
    console.error("❌ Error launching campaign:", err);
    return res.status(500).json({ error: "Failed to launch campaign", details: err.message });
  }
};



