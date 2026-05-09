import { groq } from "next-sanity";

export const cafeQuery = groq`*[_type == "cafe"][0]{
  name,
  tagline,
  hero,
  logo,
  intro,
  handwerke,
  team,
  features,
  address,
  phone,
  email,
  owners,
  locationHint,
  hours,
  specialHours,
  hoursNote
}`;

export const menuSectionsQuery = groq`*[_type == "menuSection"] | order(order asc, title asc){
  _id,
  title,
  headline,
  "slug": slug.current,
  subtitle,
  intro,
  pdf{
    asset->{
      url,
      originalFilename,
      size
    }
  },
  pdfLabel,
  extras,
  "highlights": *[_type == "menuHighlight" && references(^._id)] | order(order asc, name asc){
    _id,
    name,
    category,
    description,
    price,
    note,
    featured,
    photo
  }
}`;

export const recentAktuellQuery = groq`*[_type == "aktuell"] | order(date desc)[0...3]{
  _id,
  title,
  "slug": slug.current,
  date,
  excerpt,
  cover
}`;
