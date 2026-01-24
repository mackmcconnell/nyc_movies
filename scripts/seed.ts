import { localDb, initLocalDb } from "../lib/db-local";

// Initialize the database (creates tables if they don't exist)
initLocalDb();

// Insert initial theaters using INSERT OR IGNORE to avoid duplicates
const insertTheater = localDb.prepare(`
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
  {
    name: "Quad Cinema",
    url: "https://quadcinema.com",
    slug: "quad-cinema",
  },
  {
    name: "IFC Center",
    url: "https://www.ifccenter.com",
    slug: "ifc-center",
  },
];

for (const theater of theaters) {
  insertTheater.run(theater.name, theater.url, theater.slug);
}

console.log("Database seeded successfully!");
console.log("Theaters inserted:");
const allTheaters = localDb.prepare("SELECT * FROM Theater").all();
console.table(allTheaters);
