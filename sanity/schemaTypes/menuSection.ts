import { defineField, defineType } from "sanity";

export const menuSection = defineType({
  name: "menuSection",
  type: "document",
  title: "Sortiments-Bereich",
  description:
    "Ein Abschnitt des Sortiments mit optionalen Hervorhebungen. Z.B. Brot & Backwaren, Konditorei & Patisserie, Café & Frühstück.",
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Titel",
      description: "Z.B. Brot & Backwaren oder Konditorei & Patisserie.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "headline",
      type: "string",
      title: "Headline",
      description:
        "Optional. Erscheint gross über der Liste. Z.B. Täglich frisch aus dem Holzofen.",
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
        "Optional. Z.B. Frühstück täglich ab 06.00 Uhr.",
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
      title: "PDF (vollständiges Sortiment)",
      description: "Lade hier ein aktuelles PDF hoch. Die Besucher sehen einen Download-Link.",
      options: { accept: "application/pdf" },
    }),
    defineField({
      name: "pdfLabel",
      type: "string",
      title: "Beschriftung des PDF-Links",
      description: "Z.B. PDF · vollständige Sortimentsliste herunterladen.",
    }),
    defineField({
      name: "extras",
      type: "array",
      title: "Zusätze",
      description: "Optional. Kleine Zusatz-Liste am Ende des Abschnitts.",
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
