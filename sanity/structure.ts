import type { StructureResolver } from "sanity/structure";

const SINGLETON_TYPES = new Set(["cafe"]);

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Inhalte")
    .items([
      S.listItem()
        .title("Café-Informationen")
        .id("cafe")
        .child(
          S.documentTypeList("cafe")
            .title("Café-Informationen")
            .canHandleIntent(() => false),
        ),
      S.divider(),
      S.listItem()
        .title("Menü")
        .id("menu")
        .child(
          S.list()
            .title("Menü")
            .items([
              S.documentTypeListItem("menuSection").title("Abschnitte"),
              S.documentTypeListItem("menuHighlight").title("Hervorhebungen"),
            ]),
        ),
      S.documentTypeListItem("aktuell").title("Aktuelles"),
    ]);

export { SINGLETON_TYPES };
