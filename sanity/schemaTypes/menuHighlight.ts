import { defineField, defineType } from "sanity";

export const menuHighlight = defineType({
  name: "menuHighlight",
  type: "document",
  title: "Produkt",
  description:
    "Ein einzelnes Produkt oder Angebot, das auf der Website hervorgehoben wird. Nicht jeder Artikel muss erfasst sein, nur die Aushängeschilder.",
  fields: [
    defineField({
      name: "name",
      type: "string",
      title: "Name",
      description: "Z.B. Bergbauernbrot oder Grosses Bäckerzmorgen.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "section",
      type: "reference",
      title: "Sortiments-Bereich",
      description: "Zu welchem Bereich gehört dieses Produkt?",
      to: [{ type: "menuSection" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      type: "string",
      title: "Unter-Kategorie",
      description:
        "Optional. Innerhalb des Bereichs gruppiert. Z.B. Torten, Patisserie, Teestückli.",
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
      description: "Z.B. Fr. 5.00, oder ab Fr. 18.00.",
    }),
    defineField({
      name: "note",
      type: "string",
      title: "Hinweis",
      description: "Optional. Z.B. saisonal oder auf Vorbestellung.",
    }),
    defineField({
      name: "featured",
      type: "boolean",
      title: "Empfehlung des Hauses",
      description: "Wenn aktiviert, wird dieses Produkt besonders hervorgehoben.",
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
      description: "Niedrigere Zahlen erscheinen zuerst, innerhalb des Bereichs.",
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
      const subtitle = [section, price, featured ? "Empfehlung" : null]
        .filter(Boolean)
        .join(" · ");
      return { title, subtitle, media };
    },
  },
  orderings: [
    {
      title: "Bereich und Sortierung",
      name: "sectionOrder",
      by: [
        { field: "section.title", direction: "asc" },
        { field: "order", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    },
  ],
});
