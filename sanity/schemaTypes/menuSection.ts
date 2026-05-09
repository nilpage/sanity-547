import { defineField, defineType } from "sanity";

export const menuSection = defineType({
  name: "menuSection",
  type: "document",
  title: "Menü-Abschnitt",
  description:
    "Ein Abschnitt der Speisekarte mit eigenem PDF und optionalen Hervorhebungen. Z.B. Frühstückskarte, Speisekarte, Coupes.",
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Titel",
      description: "Z.B. Frühstückskarte.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "headline",
      type: "string",
      title: "Headline",
      description:
        "Optional. Erscheint gross über der Liste. Z.B. Beginnen Sie den Tag im Hause Ryser.",
    }),
    defineField({
      name: "slug",
      type: "slug",
      title: "URL-Pfad",
      options: { source: "title", maxLength: 64 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subtitle",
      type: "string",
      title: "Untertitel",
      description:
        "Optional. Z.B. Mo bis Fr · 11:00 bis 14:30.",
    }),
    defineField({
      name: "intro",
      type: "text",
      title: "Einleitung",
      description: "Optionaler kurzer Text vor der Liste.",
      rows: 3,
    }),
    defineField({
      name: "pdf",
      type: "file",
      title: "PDF der vollständigen Karte",
      description:
        "Lade hier die aktuelle Version des PDF hoch. Die Besucher sehen einen Download-Link.",
      options: { accept: "application/pdf" },
    }),
    defineField({
      name: "pdfLabel",
      type: "string",
      title: "Beschriftung des PDF-Links",
      description:
        "Z.B. PDF · Frühstückskarte. Wird unter den Hervorhebungen angezeigt.",
    }),
    defineField({
      name: "extras",
      type: "array",
      title: "Zusätze (Extra dazu)",
      description:
        "Optional. Kleine Zusatz-Liste am Ende des Abschnitts. Z.B. 3-Minuten-Ei für 2.50.",
      of: [
        {
          type: "object",
          name: "extraEntry",
          title: "Eintrag",
          fields: [
            defineField({
              name: "name",
              type: "string",
              title: "Name",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "price",
              type: "string",
              title: "Preis",
            }),
          ],
          preview: {
            select: { title: "name", subtitle: "price" },
          },
        },
      ],
    }),
    defineField({
      name: "order",
      type: "number",
      title: "Sortierung",
      description: "Niedrigere Zahlen erscheinen zuerst.",
      initialValue: 100,
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "subtitle", media: "pdf" },
  },
  orderings: [
    {
      title: "Reihenfolge",
      name: "orderAsc",
      by: [
        { field: "order", direction: "asc" },
        { field: "title", direction: "asc" },
      ],
    },
  ],
});
