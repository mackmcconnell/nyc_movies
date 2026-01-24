import { db, initDb } from "../lib/db";

// Initialize the database (creates tables if they don't exist)
initDb();

// Insert initial theaters using INSERT OR IGNORE to avoid duplicates
const insertTheater = db.prepare(`
  INSERT OR IGNORE INTO Theater (name, url, slug)
  VALUES (?, ?, ?)
`);

const theaters = [
  {
    name: "Metrograph",
    url: "https://metrograph.com",
    slug: "metrograph",
  },
  {
    name: "Film Forum",
    url: "https://filmforum.org",
    slug: "film-forum",
  },
];

for (const theater of theaters) {
  insertTheater.run(theater.name, theater.url, theater.slug);
}

console.log("Database seeded successfully!");
console.log("Theaters inserted:");
const allTheaters = db.prepare("SELECT * FROM Theater").all();
console.table(allTheaters);
