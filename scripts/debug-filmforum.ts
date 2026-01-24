/**
 * Debug script to examine Film Forum HTML structure
 */
import * as cheerio from "cheerio";

const BASE_URL = "https://filmforum.org";

async function debug() {
  const url = `${BASE_URL}/film/seeds`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log("=== Checking for tabs ===");
  for (let i = 0; i < 7; i++) {
    const tab = $(`#tabs-${i}`);
    if (tab.length > 0) {
      console.log(`\n--- Tab ${i} exists ---`);
      console.log(`HTML length: ${$.html(tab).length}`);
      console.log(`Text preview (first 500 chars): ${tab.text().slice(0, 500)}`);

      // Look for links to films
      const links = tab.find('a[href*="/film/"]');
      console.log(`\nFilm links found in tab ${i}: ${links.length}`);

      links.each((j, el) => {
        const link = $(el);
        const href = link.attr("href");
        const text = link.text().trim();
        const parent = link.parent();
        const parentText = parent.text().trim().slice(0, 200);
        console.log(`  [${j}] ${text} -> ${href}`);
        console.log(`      Parent text: ${parentText}`);
      });
    } else {
      console.log(`Tab ${i} NOT FOUND`);
    }
  }

  // Also check for other possible tab structures
  console.log("\n=== Other tab-like elements ===");
  const tabPanels = $('[role="tabpanel"], .tab-panel, .tabs-panel, [class*="tab"]');
  console.log(`Found ${tabPanels.length} tab-like elements`);

  // Check for schedule section
  console.log("\n=== Schedule section ===");
  const scheduleSection = $('[class*="schedule"], [id*="schedule"]');
  console.log(`Schedule sections found: ${scheduleSection.length}`);

  // Look at the page structure
  console.log("\n=== Main content structure ===");
  $("main, [role='main'], .content, #content").each((i, el) => {
    console.log(`Main element ${i}: ${$(el).attr("class") || $(el).attr("id")}`);
    console.log(`Children: ${$(el).children().length}`);
  });

  // Find all links to /film/seeds specifically
  console.log("\n=== All links to /film/seeds ===");
  $('a[href*="/film/seeds"]').each((i, el) => {
    const link = $(el);
    const parent = link.parent();
    const grandparent = parent.parent();
    console.log(`Link ${i}:`);
    console.log(`  Text: ${link.text().trim()}`);
    console.log(`  Parent tag: ${parent.prop("tagName")}`);
    console.log(`  Parent class: ${parent.attr("class")}`);
    console.log(`  Parent text (100 chars): ${parent.text().trim().slice(0, 100)}`);
    console.log(`  Grandparent tag: ${grandparent.prop("tagName")}`);
    console.log(`  Grandparent class: ${grandparent.attr("class")}`);
    console.log(`  Grandparent text (200 chars): ${grandparent.text().trim().slice(0, 200)}`);
    console.log(`  Grandparent HTML (300 chars): ${$.html(grandparent).slice(0, 300)}`);
  });

  // Check tab 0 HTML structure more closely
  console.log("\n=== Tab 0 HTML (first 1500 chars) ===");
  const tab0 = $("#tabs-0");
  console.log($.html(tab0).slice(0, 1500));
}

debug().catch(console.error);
