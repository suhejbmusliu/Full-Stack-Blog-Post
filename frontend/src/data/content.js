export const YEARS = ["2025", "2024", "2023", "2022"];

export const NAV = [
  { label: "Home", to: "/" },
  {
    label: "Activities",
    type: "dropdown",
    items: [
      { label: "All", to: "/activities" },
      ...YEARS.map((y) => ({ label: y, to: `/activities/${y}` })),
    ],
  },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];
