import { defineField, defineType } from "sanity";

export const menuHighlight = defineType({
  name: "menuHighlight",
  type: "document",
  title: "Menü-Hervorhebung",
  description:
    "Ein einzelner Eintrag, der auf der Webseite als Karte gezeigt wird. Nicht jede Position aus dem PDF muss hier erfasst sein. Hier kommen nur die Aushängeschilder.",
  fields: [
    defineField({
      name: "name",
      type: "string",
      title: "Name",
      description: "Z.B. Coupe Ryser, oder Sonntags-Frühstück.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "section",
      type: "reference",
      title: "Abschnitt",
      description: "Zu welchem Menü-Abschnitt gehört dieser Eintrag?",
      to: [{ type: "menuSection" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      type: "string",
      title: "Unter-Kategorie",
      description:
        "Optional. Innerhalb des Abschnitts gruppiert. Z.B. Mittagsmenü, Suppen, Toasts.",
    }),
    defineField({
      name: "description",
      type: "text",
      title: "Beschreibung",
      description: "Z.B. die Zutaten oder eine kurze Beschreibung.",
      rows: 2,
    }),
    defineField({
      name: "price",
      type: "string",
      title: "Preis",
      description: "Z.B. 9.80, oder ab 18.00.",
    }),
    defineField({
      name: "note",
      type: "string",
      title: "Hinweis",
      description: "Optional. Z.B. auch werktags.",
    }),
    defineField({
      name: "featured",
      type: "boolean",
      title: "Hausspezialität",
      description: "Wenn aktiviert, wird dieser Eintrag besonders hervorgehoben.",
      initialValue: false,
    }),
    defineField({
      name: "photo",
      type: "image",
      title: "Foto",
      description: "Optional. Quadratisch sieht am besten aus.",
      options: { hotspot: true },
    }),
    defineField({
      name: "order",
      type: "number",
      title: "Sortierung",
      description:
        "Niedrigere Zahlen erscheinen zuerst, innerhalb des Abschnitts.",
      initialValue: 100,
    }),
  ],
  preview: {
    select: {
      title: "name",
      section: "section.title",
      price: "price",
      featured: "featured",
      media: "photo",
    },
    prepare({ title, section, price, featured, media }) {
      const subtitle = [section, price, featured ? "Hausspezialität" : null]
        .filter(Boolean)
        .join(" · ");
      return { title, subtitle, media };
    },
  },
  orderings: [
    {
      title: "Abschnitt und Sortierung",
      name: "sectionOrder",
      by: [
        { field: "section.title", direction: "asc" },
        { field: "order", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    },
  ],
});
