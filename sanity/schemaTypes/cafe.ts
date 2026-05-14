import { defineField, defineType } from "sanity";

export const cafe = defineType({
  name: "cafe",
  type: "document",
  title: "Informationen",
  groups: [
    { name: "general", title: "Allgemein", default: true },
    { name: "content", title: "Inhalte" },
    { name: "contact", title: "Kontakt & Adresse" },
    { name: "hours", title: "Öffnungszeiten" },
  ],
  fields: [
    // -- Allgemein --
    defineField({
      name: "name",
      type: "string",
      title: "Name",
      description: "Vollständiger Name des Betriebs.",
      group: "general",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "tagline",
      type: "string",
      title: "Untertitel",
      description:
        "Ein kurzer Satz unter dem Namen. Erscheint im Hero-Bereich.",
      group: "general",
    }),
    defineField({
      name: "hero",
      type: "image",
      title: "Hero-Foto",
      description: "Grosses Foto oben auf der Seite. Mindestens 1600 Pixel breit.",
      options: { hotspot: true },
      group: "general",
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Bildbeschreibung (Alt-Text)",
        }),
      ],
    }),
    defineField({
      name: "logo",
      type: "image",
      title: "Logo",
      description: "Optionales Logo, erscheint in Header und Footer.",
      group: "general",
    }),
    defineField({
      name: "sourceUrl",
      type: "url",
      title: "Bestehende Website (URL)",
      description: "Link zur aktuellen Website des Betriebs. Erscheint im Impressum-Hinweis.",
      group: "general",
    }),
    defineField({
      name: "sourceLabel",
      type: "string",
      title: "Bestehende Website (Anzeigename)",
      description: "Kurze Adresse ohne https://, z.B. baeckerei-meyer.ch.",
      group: "general",
    }),

    // -- Inhalte --
    defineField({
      name: "intro",
      type: "array",
      title: "Einleitung",
      description:
        "Kurzer einleitender Absatz unter dem Hero. Der erste Buchstabe wird als Schmuck-Initial dargestellt.",
      group: "content",
      of: [
        {
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
          lists: [],
          marks: {
            decorators: [
              { title: "Fett", value: "strong" },
              { title: "Kursiv", value: "em" },
            ],
            annotations: [],
          },
        },
      ],
    }),
    defineField({
      name: "handwerke",
      type: "array",
      title: "Bereiche",
      description:
        "Die Geschäftsbereiche, z.B. Bäckerei, Konditorei, Café. Erscheinen als nummerierte Karten. Empfohlen: 3 oder 6 Einträge.",
      group: "content",
      of: [
        {
          type: "object",
          name: "handwerk",
          title: "Bereich",
          fields: [
            defineField({
              name: "name",
              type: "string",
              title: "Name",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "description",
              type: "text",
              title: "Beschreibung",
              rows: 3,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: "name", subtitle: "description" },
          },
        },
      ],
    }),
    defineField({
      name: "team",
      type: "object",
      title: "Familie / Inhaber",
      description: "Foto und Beschreibung der Inhaber. Optional.",
      group: "content",
      fields: [
        defineField({
          name: "photo",
          type: "image",
          title: "Foto",
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
              description: "Erscheint unter dem Foto.",
            }),
          ],
        }),
        defineField({
          name: "title",
          type: "string",
          title: "Überschrift",
          description: "Z.B. Urban und Sandra Meyer.",
        }),
        defineField({
          name: "body",
          type: "text",
          title: "Beschreibender Text",
          rows: 5,
        }),
      ],
    }),
    defineField({
      name: "features",
      type: "array",
      title: "Highlights / Geschichte",
      description:
        "Kurze Prosa-Abschnitte für besondere Themen wie Holzofen, Hausspezialitäten, Geschichte. Optional.",
      group: "content",
      of: [
        {
          type: "object",
          name: "feature",
          title: "Highlight",
          fields: [
            defineField({
              name: "title",
              type: "string",
              title: "Titel",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "eyebrow",
              type: "string",
              title: "Über-Titel",
              description: "Optional. Z.B. Holzofen oder Seit 1874.",
            }),
            defineField({
              name: "body",
              type: "text",
              title: "Beschreibender Text",
              rows: 4,
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "attribution",
              type: "string",
              title: "Quellenangabe / Detail",
              description: "Optional. Z.B. Martin Bucher, Bäcker-Konditor.",
            }),
          ],
          preview: {
            select: { title: "title", subtitle: "body" },
          },
        },
      ],
    }),

    // -- Kontakt & Adresse --
    defineField({
      name: "address",
      type: "object",
      title: "Adresse",
      group: "contact",
      fields: [
        defineField({ name: "street", type: "string", title: "Strasse" }),
        defineField({ name: "zip", type: "string", title: "PLZ" }),
        defineField({ name: "city", type: "string", title: "Ort" }),
      ],
      options: { columns: 3 },
    }),
    defineField({
      name: "phone",
      type: "string",
      title: "Telefon",
      description: "Mit Vorwahl, zum Beispiel: 041 917 10 74.",
      group: "contact",
    }),
    defineField({
      name: "email",
      type: "string",
      title: "E-Mail",
      description: "Kontakt-E-Mail. Erscheint im Footer und auf der Kontaktseite.",
      group: "contact",
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: "owners",
      type: "string",
      title: "Inhaber",
      description: "Z.B. Urban und Sandra Meyer. Erscheint im Kontaktblock.",
      group: "contact",
    }),
    defineField({
      name: "locationHint",
      type: "text",
      title: "Standort-Beschreibung",
      description: "Kurzer Satz, wo man Sie findet.",
      group: "contact",
      rows: 2,
    }),

    // -- Öffnungszeiten --
    defineField({
      name: "hours",
      type: "array",
      title: "Reguläre Öffnungszeiten",
      description:
        "Pro Wochentag oder Bereich eine Zeile. Reihenfolge bestimmt die Anzeige.",
      group: "hours",
      of: [
        {
          type: "object",
          name: "hourEntry",
          title: "Eintrag",
          fields: [
            defineField({
              name: "label",
              type: "string",
              title: "Tag oder Bereich",
              description: "Zum Beispiel: Montag bis Freitag, oder Sonntag.",
            }),
            defineField({
              name: "value",
              type: "string",
              title: "Zeit",
              description: "Zum Beispiel: 06.00 bis 18.00, oder geschlossen.",
            }),
          ],
          preview: {
            select: { title: "label", subtitle: "value" },
          },
        },
      ],
    }),
    defineField({
      name: "specialHours",
      type: "array",
      title: "Feiertags-Öffnungszeiten",
      description: "Spezielle Tage wie Auffahrt, Weihnachten. Optional.",
      group: "hours",
      of: [
        {
          type: "object",
          name: "specialHourEntry",
          title: "Eintrag",
          fields: [
            defineField({
              name: "date",
              type: "string",
              title: "Datum oder Anlass",
              description: "Zum Beispiel: Auffahrt 14. Mai.",
            }),
            defineField({
              name: "value",
              type: "string",
              title: "Zeit oder Status",
              description: "Zum Beispiel: 08.00 bis 17.00 Uhr, oder geschlossen.",
            }),
          ],
          preview: {
            select: { title: "date", subtitle: "value" },
          },
        },
      ],
    }),
    defineField({
      name: "hoursNote",
      type: "text",
      title: "Hinweis zu den Öffnungszeiten",
      description: "Optionaler Zusatz unter der Tabelle.",
      group: "hours",
      rows: 2,
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "tagline" },
    prepare({ title, subtitle }) {
      return {
        title: title || "Informationen",
        subtitle: subtitle || "Klicken zum Bearbeiten",
      };
    },
  },
});
