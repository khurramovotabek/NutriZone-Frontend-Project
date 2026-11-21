/**
 * The person behind NutriZone: founder, CEO and the developer who built the platform. One source for the footer
 * credit, the About page and schema.org (Organization.founder / WebSite.creator). The `@id` is the same node his
 * own site (welicodev.uz) publishes, so search engines join both sites' Person into one entity -- the store gains a
 * named, verifiable founder (E-E-A-T) and his portfolio gains the store.
 */
export const FOUNDER = {
  id: "https://welicodev.uz/#person",
  name: "Otabek Xurramov",
  alternateName: ["Otabek Khurramov", "Otabek Xurramov", "Отабек Хуррамов", "WeliCoDev", "welicodev"],
  url: "https://welicodev.uz",
  site: "welicodev.uz",
  image: "https://welicodev.uz/media/site/otabek-avatar.jpg",
  jobTitle: "Founder & CEO of NutriZone · Python Backend Developer",
  sameAs: [
    "https://welicodev.uz",
    "https://github.com/welicodev",
    "https://github.com/khurramovotabek",
    "https://uz.linkedin.com/in/otabek-khurramov-87489725b",
    "https://t.me/welicodevbot",
    "https://facebook.com/welicodev",
  ],
  knowsAbout: ["Python", "Django", "E-commerce", "Telegram bots", "Sports nutrition retail"],
} as const;

/** schema.org Person node (full), for Organization.founder and WebSite.creator. */
export function founderJsonLd() {
  return {
    "@type": "Person",
    "@id": FOUNDER.id,
    name: FOUNDER.name,
    alternateName: [...FOUNDER.alternateName],
    url: FOUNDER.url,
    image: FOUNDER.image,
    jobTitle: FOUNDER.jobTitle,
    sameAs: [...FOUNDER.sameAs],
    knowsAbout: [...FOUNDER.knowsAbout],
    nationality: { "@type": "Country", name: "Uzbekistan" },
  };
}
