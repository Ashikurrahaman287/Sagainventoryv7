/**
 * UGC-approved universities located in Dhaka city / greater Dhaka.
 * Source: Wikipedia list of universities in Bangladesh (Dhaka city entries).
 * Note: DUET (Gazipur), National University (Gazipur), and Bangladesh Open
 * University (Gazipur) are in Dhaka Division but NOT Dhaka city — excluded.
 */

export interface University {
  value: string;
  label: string;
  type: "public" | "private";
  shortName?: string;
  area?: string;
  estYear?: number;
}

export const DHAKA_UNIVERSITIES: University[] = [
  // ── Public ────────────────────────────────────────────────────────────────
  {
    value: "University of Dhaka",
    label: "University of Dhaka",
    type: "public",
    shortName: "DU",
    area: "Shahbagh",
    estYear: 1921,
  },
  {
    value: "Bangladesh University of Engineering and Technology",
    label: "Bangladesh University of Engineering and Technology",
    type: "public",
    shortName: "BUET",
    area: "Palashi",
    estYear: 1962,
  },
  {
    value: "Jahangirnagar University",
    label: "Jahangirnagar University",
    type: "public",
    shortName: "JU",
    area: "Savar",
    estYear: 1970,
  },
  {
    value: "Bangladesh Medical University",
    label: "Bangladesh Medical University",
    type: "public",
    shortName: "BMU",
    area: "Shahbagh",
    estYear: 1998,
  },
  {
    value: "Military Institute of Science and Technology",
    label: "Military Institute of Science and Technology",
    type: "public",
    shortName: "MIST",
    area: "Mirpur Cantonment",
    estYear: 1998,
  },
  {
    value: "Sher-e-Bangla Agricultural University",
    label: "Sher-e-Bangla Agricultural University",
    type: "public",
    shortName: "SAU",
    area: "Sher-e-Bangla Nagar",
    estYear: 2001,
  },
  {
    value: "Jagannath University",
    label: "Jagannath University",
    type: "public",
    shortName: "JnU",
    area: "Sadarghat",
    estYear: 2005,
  },
  {
    value: "Bangladesh University of Professionals",
    label: "Bangladesh University of Professionals",
    type: "public",
    shortName: "BUP",
    area: "Mirpur",
    estYear: 2008,
  },
  {
    value: "Bangladesh University of Textiles",
    label: "Bangladesh University of Textiles",
    type: "public",
    shortName: "BUTEX",
    area: "Tejgaon",
    estYear: 2010,
  },
  {
    value: "Bangladesh Maritime University",
    label: "Bangladesh Maritime University",
    type: "public",
    shortName: "BMU (Maritime)",
    area: "Mirpur",
    estYear: 2013,
  },
  {
    value: "Islamic Arabic University",
    label: "Islamic Arabic University",
    type: "public",
    shortName: "IAU",
    area: "Mohammadpur",
    estYear: 2013,
  },
  {
    value: "Aviation and Aerospace University Bangladesh",
    label: "Aviation and Aerospace University Bangladesh",
    type: "public",
    shortName: "AAUB",
  },
  {
    value: "Dhaka Central University",
    label: "Dhaka Central University",
    type: "public",
    shortName: "DCU",
    area: "Agargaon",
  },

  // ── Private ───────────────────────────────────────────────────────────────
  {
    value: "Ahsanullah University of Science and Technology",
    label: "Ahsanullah University of Science and Technology",
    type: "private",
    shortName: "AUST",
  },
  {
    value: "American International University-Bangladesh",
    label: "American International University-Bangladesh",
    type: "private",
    shortName: "AIUB",
  },
  {
    value: "ASA University Bangladesh",
    label: "ASA University Bangladesh",
    type: "private",
    shortName: "ASAUB",
  },
  {
    value: "Asian University of Bangladesh",
    label: "Asian University of Bangladesh",
    type: "private",
    shortName: "AUB",
  },
  {
    value: "Atish Dipankar University of Science and Technology",
    label: "Atish Dipankar University of Science and Technology",
    type: "private",
    shortName: "ADUST",
  },
  {
    value: "Bangladesh Islami University",
    label: "Bangladesh Islami University",
    type: "private",
    shortName: "BIU",
  },
  {
    value: "Bangladesh University",
    label: "Bangladesh University",
    type: "private",
    shortName: "BU",
  },
  {
    value: "Bangladesh University of Business and Technology",
    label: "Bangladesh University of Business and Technology",
    type: "private",
    shortName: "BUBT",
  },
  {
    value: "BGMEA University of Fashion and Technology",
    label: "BGMEA University of Fashion and Technology",
    type: "private",
    shortName: "BUFT",
  },
  {
    value: "BRAC University",
    label: "BRAC University",
    type: "private",
    shortName: "BRACU",
  },
  {
    value: "Canadian University of Bangladesh",
    label: "Canadian University of Bangladesh",
    type: "private",
    shortName: "CUB",
  },
  {
    value: "Central Women's University",
    label: "Central Women's University",
    type: "private",
    shortName: "CWU",
  },
  {
    value: "City University",
    label: "City University",
    type: "private",
  },
  {
    value: "Daffodil International University",
    label: "Daffodil International University",
    type: "private",
    shortName: "DIU",
  },
  {
    value: "Dhaka International University",
    label: "Dhaka International University",
    type: "private",
    shortName: "DIU2",
  },
  {
    value: "East West University",
    label: "East West University",
    type: "private",
    shortName: "EWU",
  },
  {
    value: "Eastern University",
    label: "Eastern University",
    type: "private",
    shortName: "EU",
  },
  {
    value: "European University of Bangladesh",
    label: "European University of Bangladesh",
    type: "private",
    shortName: "EUB",
  },
  {
    value: "Fareast International University",
    label: "Fareast International University",
    type: "private",
    shortName: "FIU",
  },
  {
    value: "Gono Bishwabidyalay",
    label: "Gono Bishwabidyalay",
    type: "private",
    shortName: "GB",
  },
  {
    value: "Green University of Bangladesh",
    label: "Green University of Bangladesh",
    type: "private",
    shortName: "GUB",
  },
  {
    value: "IBAIS University",
    label: "IBAIS University",
    type: "private",
  },
  {
    value: "Independent University Bangladesh",
    label: "Independent University Bangladesh",
    type: "private",
    shortName: "IUB",
  },
  {
    value: "International University of Business Agriculture and Technology",
    label: "International University of Business Agriculture and Technology",
    type: "private",
    shortName: "IUBAT",
  },
  {
    value: "Manarat International University",
    label: "Manarat International University",
    type: "private",
    shortName: "MIU",
  },
  {
    value: "North South University",
    label: "North South University",
    type: "private",
    shortName: "NSU",
  },
  {
    value: "Northern University Bangladesh",
    label: "Northern University Bangladesh",
    type: "private",
    shortName: "NUB",
  },
  {
    value: "Notre Dame University Bangladesh",
    label: "Notre Dame University Bangladesh",
    type: "private",
    shortName: "NDUB",
  },
  {
    value: "Presidency University",
    label: "Presidency University",
    type: "private",
  },
  {
    value: "Prime University",
    label: "Prime University",
    type: "private",
  },
  {
    value: "Primeasia University",
    label: "Primeasia University",
    type: "private",
  },
  {
    value: "Royal University of Dhaka",
    label: "Royal University of Dhaka",
    type: "private",
  },
  {
    value: "Shanto-Mariam University of Creative Technology",
    label: "Shanto-Mariam University of Creative Technology",
    type: "private",
    shortName: "SMUCT",
  },
  {
    value: "Southeast University",
    label: "Southeast University",
    type: "private",
    shortName: "SEU",
  },
  {
    value: "Stamford University Bangladesh",
    label: "Stamford University Bangladesh",
    type: "private",
    shortName: "SUB",
  },
  {
    value: "State University of Bangladesh",
    label: "State University of Bangladesh",
    type: "private",
    shortName: "SuB",
  },
  {
    value: "United International University",
    label: "United International University",
    type: "private",
    shortName: "UIU",
  },
  {
    value: "University of Asia Pacific",
    label: "University of Asia Pacific",
    type: "private",
    shortName: "UAP",
  },
  {
    value: "University of Development Alternative",
    label: "University of Development Alternative",
    type: "private",
    shortName: "UODA",
  },
  {
    value: "University of Information Technology and Sciences",
    label: "University of Information Technology and Sciences",
    type: "private",
    shortName: "UITS",
  },
  {
    value: "University of Liberal Arts Bangladesh",
    label: "University of Liberal Arts Bangladesh",
    type: "private",
    shortName: "ULAB",
  },
  {
    value: "University of South Asia",
    label: "University of South Asia",
    type: "private",
    shortName: "USA",
  },
  {
    value: "Uttara University",
    label: "Uttara University",
    type: "private",
  },
  {
    value: "Victoria University of Bangladesh",
    label: "Victoria University of Bangladesh",
    type: "private",
  },
  {
    value: "World University of Bangladesh",
    label: "World University of Bangladesh",
    type: "private",
    shortName: "WUB",
  },
];

/** Sorted list: public first (by est. year), then private (alphabetically) */
export const UNIVERSITIES_SORTED = [
  ...DHAKA_UNIVERSITIES.filter((u) => u.type === "public").sort(
    (a, b) => (a.estYear ?? 9999) - (b.estYear ?? 9999)
  ),
  ...DHAKA_UNIVERSITIES.filter((u) => u.type === "private").sort((a, b) =>
    a.label.localeCompare(b.label)
  ),
];
