import { defineField, defineType } from "sanity";

export const aktuell = defineType({
  name: "aktuell",
  type: "document",
  title: "Aktuelles",
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Titel",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      title: "URL-Pfad",
      description: "Wird automatisch aus dem Titel erstellt. Bei Bedarf anpassen.",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      type: "date",
      title: "Datum",
      description: "Erscheinungsdatum. Bestimmt die Reihenfolge in der Liste.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "excerpt",
      type: "text",
      title: "Vorschautext",
      description: "Kurze Zusammenfassung. Erscheint in der Übersicht.",
      rows: 2,
    }),
    defineField({
      name: "cover",
      type: "image",
      title: "Vorschaubild",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Bildbeschreibung",
        }),
      ],
    }),
    defineField({
      name: "body",
      type: "array",
      title: "Inhalt",
      description: "Der eigentliche Text. Bilder können dazwischen platziert werden.",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Zwischenüberschrift", value: "h2" },
            { title: "Kleine Überschrift", value: "h3" },
            { title: "Zitat", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Fett", value: "strong" },
              { title: "Kursiv", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  defineField({
                    name: "href",
                    type: "url",
                    title: "Link-Adresse",
                    validation: (Rule) =>
                      Rule.uri({ scheme: ["http", "https", "mailto", "tel"] }),
                  }),
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              type: "string",
              title: "Bildbeschreibung",
            }),
            defineField({
              name: "caption",
              type: "string",
              title: "Bildunterschrift",
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      date: "date",
      media: "cover",
    },
    prepare({ title, date, media }) {
      return {
        title,
        subtitle: date
          ? new Date(date).toLocaleDateString("de-CH", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "Kein Datum",
        media,
      };
    },
  },
  orderings: [
    {
      title: "Datum, neueste zuerst",
      name: "dateDesc",
      by: [{ field: "date", direction: "desc" }],
    },
  ],
});
