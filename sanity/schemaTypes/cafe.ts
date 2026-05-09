import { defineField, defineType } from "sanity";

export const cafe = defineType({
  name: "cafe",
  type: "document",
  title: "Café-Informationen",
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
      title: "Handwerke",
      description:
        "Die Bereiche, in denen Sie tätig sind. Erscheinen als nummerierte Karten. Empfohlen: 2 bis 4 Einträge.",
      group: "content",
      of: [
        {
          type: "object",
          name: "handwerk",
          title: "Handwerk",
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
      title: "Familie / Team",
      description: "Foto und Beschreibung der Inhaber. Optional.",
      group: "content",
      fields: [
        defineField({
          name: "photo",
          type: "image",
          title: "Team-Foto",
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
              description: "Erscheint unter dem Foto. Z.B. Paul und Heidi in der Backstube.",
            }),
          ],
        }),
        defineField({
          name: "title",
          type: "string",
          title: "Überschrift",
          description: "Z.B. Paul und Heidi Ryser-Danioth.",
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
      title: "Spezialitäten / Geschichten",
      description:
        "Kurze Prosa-Abschnitte für besondere Themen wie Lieferanten, Hausspezialität, Terrasse. Optional.",
      group: "content",
      of: [
        {
          type: "object",
          name: "feature",
          title: "Feature",
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
              description: "Optional. Z.B. Couverture oder Hausspezialität.",
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
              description:
                "Optional. Z.B. Felchlin, Ibach SZ, Schweizer Couverture seit 1908.",
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
        defineField({ name: "street", type: "string", title: "Strasse / Postfach" }),
        defineField({ name: "zip", type: "string", title: "PLZ" }),
        defineField({ name: "city", type: "string", title: "Ort" }),
      ],
      options: { columns: 3 },
    }),
    defineField({
      name: "phone",
      type: "string",
      title: "Telefon",
      description: "Mit Vorwahl, zum Beispiel: 041 811 31 20.",
      group: "contact",
    }),
    defineField({
      name: "email",
      type: "string",
      title: "E-Mail",
      description:
        "Kontakt-E-Mail. Erscheint im Footer und auf der Kontaktseite.",
      group: "contact",
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: "owners",
      type: "string",
      title: "Inhaber",
      description: "Z.B. Paul und Heidi Ryser-Danioth. Erscheint im Kontaktblock.",
      group: "contact",
    }),
    defineField({
      name: "locationHint",
      type: "text",
      title: "Standort-Beschreibung",
      description:
        "Kurzer Satz, wo man Sie findet. Z.B. zentral in Schwyz, unterhalb des Hauptplatzes.",
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
              description:
                "Zum Beispiel: Montag bis Freitag, oder Sonntag und Feiertage.",
            }),
            defineField({
              name: "value",
              type: "string",
              title: "Zeit",
              description: "Zum Beispiel: 7.00 bis 18.00, oder geschlossen.",
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
      description:
        "Spezielle Tage wie Weihnachten, Silvester, Ostern. Optional.",
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
              description: "Zum Beispiel: 24.12., oder Ostermontag.",
            }),
            defineField({
              name: "value",
              type: "string",
              title: "Zeit oder Status",
              description: "Zum Beispiel: bis 16.00 offen, oder geschlossen.",
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
      description:
        "Optionaler Zusatz unter der Tabelle. Z.B. Reservationen nur per Telefon.",
      group: "hours",
      rows: 2,
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "tagline" },
    prepare({ title, subtitle }) {
      return {
        title: title || "Café-Informationen",
        subtitle: subtitle || "Klicken zum Bearbeiten",
      };
    },
  },
});
