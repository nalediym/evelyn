// Evelyn Dream Lens — Background Service Worker
// All processing is local. No raw URLs leave the extension.

const ALARM_NAME = "evelyn-dream-lens-refresh";
const REFRESH_INTERVAL_MINUTES = 30;
const HISTORY_DAYS = 7;
const HISTORY_MAX_RESULTS = 5000;

// --- Domain categorization ---

const DOMAIN_CATEGORIES = {
  // Video
  "youtube.com": "video",
  "youtu.be": "video",
  "vimeo.com": "video",
  "twitch.tv": "video",
  "dailymotion.com": "video",

  // Social
  "twitter.com": "social",
  "x.com": "social",
  "instagram.com": "social",
  "facebook.com": "social",
  "fb.com": "social",
  "tiktok.com": "social",
  "reddit.com": "social",
  "tumblr.com": "social",
  "linkedin.com": "social",
  "mastodon.social": "social",
  "bsky.app": "social",
  "threads.net": "social",
  "snapchat.com": "social",
  "discord.com": "social",
  "discord.gg": "social",

  // Coding
  "github.com": "coding",
  "github.dev": "coding",
  "gitlab.com": "coding",
  "stackoverflow.com": "coding",
  "stackexchange.com": "coding",
  "codepen.io": "coding",
  "codesandbox.io": "coding",
  "replit.com": "coding",
  "npmjs.com": "coding",
  "pypi.org": "coding",
  "crates.io": "coding",
  "dev.to": "coding",
  "hashnode.dev": "coding",
  "hackernews.com": "coding",
  "news.ycombinator.com": "coding",
  "leetcode.com": "coding",

  // Music
  "spotify.com": "music",
  "open.spotify.com": "music",
  "soundcloud.com": "music",
  "music.apple.com": "music",
  "music.youtube.com": "music",
  "bandcamp.com": "music",
  "tidal.com": "music",
  "last.fm": "music",

  // Shopping
  "amazon.com": "shopping",
  "amazon.co.uk": "shopping",
  "amazon.de": "shopping",
  "amazon.co.jp": "shopping",
  "ebay.com": "shopping",
  "etsy.com": "shopping",
  "shopify.com": "shopping",
  "aliexpress.com": "shopping",
  "walmart.com": "shopping",
  "target.com": "shopping",
  "bestbuy.com": "shopping",

  // Work / Productivity
  "docs.google.com": "work",
  "drive.google.com": "work",
  "sheets.google.com": "work",
  "slides.google.com": "work",
  "notion.so": "work",
  "notion.site": "work",
  "figma.com": "work",
  "miro.com": "work",
  "trello.com": "work",
  "asana.com": "work",
  "jira.atlassian.com": "work",
  "confluence.atlassian.com": "work",
  "slack.com": "work",
  "zoom.us": "work",
  "calendar.google.com": "work",
  "airtable.com": "work",
  "linear.app": "work",
  "clickup.com": "work",

  // Streaming
  "netflix.com": "streaming",
  "hulu.com": "streaming",
  "disneyplus.com": "streaming",
  "disney.com": "streaming",
  "hbomax.com": "streaming",
  "max.com": "streaming",
  "primevideo.com": "streaming",
  "peacocktv.com": "streaming",
  "crunchyroll.com": "streaming",
  "paramountplus.com": "streaming",
  "appletv.apple.com": "streaming",

  // News
  "cnn.com": "news",
  "bbc.com": "news",
  "bbc.co.uk": "news",
  "nytimes.com": "news",
  "theguardian.com": "news",
  "reuters.com": "news",
  "apnews.com": "news",
  "washingtonpost.com": "news",
  "aljazeera.com": "news",
  "npr.org": "news",
  "techcrunch.com": "news",
  "theverge.com": "news",
  "arstechnica.com": "news",
  "wired.com": "news",

  // Creative
  "behance.net": "creative",
  "dribbble.com": "creative",
  "deviantart.com": "creative",
  "artstation.com": "creative",
  "canva.com": "creative",
  "adobe.com": "creative",
  "midjourney.com": "creative",
  "openai.com": "creative",
  "anthropic.com": "creative",

  // Gaming
  "steampowered.com": "gaming",
  "store.steampowered.com": "gaming",
  "epicgames.com": "gaming",
  "itch.io": "gaming",
  "gog.com": "gaming",
  "playstation.com": "gaming",
  "xbox.com": "gaming",
  "nintendo.com": "gaming",
  "ign.com": "gaming",
  "kotaku.com": "gaming",
  "pcgamer.com": "gaming",

  // Education / Reference
  "wikipedia.org": "reference",
  "en.wikipedia.org": "reference",
  "medium.com": "reference",
  "substack.com": "reference",
  "coursera.org": "reference",
  "udemy.com": "reference",
  "khanacademy.org": "reference",
};

/**
 * Categorize a URL into a human-readable type.
 * Never returns the raw URL — only the category string.
 */
function categorize(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    // Direct match
    if (DOMAIN_CATEGORIES[hostname]) {
      return DOMAIN_CATEGORIES[hostname];
    }

    // Check if the hostname is a subdomain of a known domain
    for (const [domain, category] of Object.entries(DOMAIN_CATEGORIES)) {
      if (hostname.endsWith("." + domain)) {
        return category;
      }
    }

    // Keyword heuristics on the hostname itself
    const keywordMap = {
      shop: "shopping",
      store: "shopping",
      buy: "shopping",
      mail: "work",
      email: "work",
      news: "news",
      blog: "reference",
      wiki: "reference",
      forum: "social",
      game: "gaming",
      play: "gaming",
      music: "music",
      video: "video",
      code: "coding",
      dev: "coding",
      art: "creative",
      design: "creative",
      learn: "reference",
      edu: "reference",
      stream: "streaming",
    };

    for (const [keyword, category] of Object.entries(keywordMap)) {
      if (hostname.includes(keyword)) {
        return category;
      }
    }

    return "other";
  } catch {
    return "other";
  }
}

// --- Profile building ---

async function getTopSitesProfile() {
  const sites = await chrome.topSites.get();
  const categorized = {};
  for (const site of sites) {
    const cat = categorize(site.url);
    categorized[cat] = (categorized[cat] || 0) + 1;
  }
  return categorized;
}

async function getHistoryProfile() {
  const oneWeekAgo = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const items = await chrome.history.search({
    text: "",
    startTime: oneWeekAgo,
    maxResults: HISTORY_MAX_RESULTS,
  });

  // Visits per hour (0-23)
  const activeHours = new Array(24).fill(0);
  const categoryCount = {};
  let nightVisits = 0;

  for (const item of items) {
    if (!item.lastVisitTime) continue;

    const date = new Date(item.lastVisitTime);
    const hour = date.getHours();
    activeHours[hour]++;

    // Night owl: 22, 23, 0, 1, 2, 3
    if (hour >= 22 || hour < 4) {
      nightVisits++;
    }

    if (item.url) {
      const cat = categorize(item.url);
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }
  }

  const totalVisitsWeek = items.length;
  const isNightOwl = totalVisitsWeek > 0 && nightVisits / totalVisitsWeek > 0.3;

  let browsingIntensity = "light";
  if (totalVisitsWeek >= 2000) {
    browsingIntensity = "heavy";
  } else if (totalVisitsWeek >= 500) {
    browsingIntensity = "moderate";
  }

  // Sort categories by count descending
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  return {
    active_hours: activeHours,
    is_night_owl: isNightOwl,
    total_visits_week: totalVisitsWeek,
    top_categories: topCategories,
    browsing_intensity: browsingIntensity,
  };
}

async function getTabsProfile() {
  const tabs = await chrome.tabs.query({});
  const categorized = {};
  for (const tab of tabs) {
    if (tab.url) {
      const cat = categorize(tab.url);
      categorized[cat] = (categorized[cat] || 0) + 1;
    }
  }
  return {
    open_count: tabs.length,
    categories: categorized,
  };
}

async function getBookmarksProfile() {
  const tree = await chrome.bookmarks.getTree();
  const folderNames = [];

  // Extract only top-level folder names (direct children of root nodes)
  for (const root of tree) {
    if (root.children) {
      for (const child of root.children) {
        if (child.children && child.title) {
          folderNames.push(child.title);
        }
      }
    }
  }

  return {
    top_level_folders: folderNames,
  };
}

async function buildDreamProfile() {
  try {
    const [topSites, history, tabs, bookmarks] = await Promise.all([
      getTopSitesProfile(),
      getHistoryProfile(),
      getTabsProfile(),
      getBookmarksProfile(),
    ]);

    const dreamProfile = {
      version: 1,
      generated_at: new Date().toISOString(),
      top_sites: topSites,
      history,
      tabs,
      bookmarks,
    };

    await chrome.storage.local.set({ dreamProfile });
    console.log("[Evelyn Dream Lens] Profile updated:", dreamProfile.generated_at);
  } catch (err) {
    console.error("[Evelyn Dream Lens] Error building profile:", err);
  }
}

// --- Lifecycle ---

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Evelyn Dream Lens] Installed. Building initial profile...");
  buildDreamProfile();

  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: REFRESH_INTERVAL_MINUTES,
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    buildDreamProfile();
  }
});
