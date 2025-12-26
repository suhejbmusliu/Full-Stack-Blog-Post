// src/utils/animations.js
export const dropdownWrapper = {
  open: {
    scaleY: 1,
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.07,
      duration: 0.18,
    },
  },
  closed: {
    scaleY: 0,
    opacity: 0,
    transition: {
      when: "afterChildren",
      duration: 0.14,
    },
  },
};

export const dropdownIcon = {
  open: { rotate: 180 },
  closed: { rotate: 0 },
};

export const dropdownItem = {
  open: { opacity: 1, y: 0 },
  closed: { opacity: 0, y: -10 },
};
