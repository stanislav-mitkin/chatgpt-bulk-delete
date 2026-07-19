// Site-specific highlight CSS. Class names (cbd-hover / cbd-selected / cbd-sidebar-active)
// are the contract the core selection state machine toggles — the selectors and visual
// treatment here are ChatGPT's own.
export const CHATGPT_STYLES = `
/* Hovered chat in selection mode */
a.cbd-hover {
  outline: 2px solid rgba(16, 163, 127, 0.7) !important;
  outline-offset: -2px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
}

/* Selected chat */
a.cbd-selected {
  background-color: rgba(16, 163, 127, 0.18) !important;
  border-radius: 6px !important;
}

/* Hovered + selected */
a.cbd-hover.cbd-selected {
  background-color: rgba(16, 163, 127, 0.28) !important;
  outline-color: #10a37f !important;
}

#history.cbd-sidebar-active {
  /* Inset (not outward) shadow: draws inside the element's own box, so it
     can't get clipped off-canvas by the sidebar sitting flush against the
     window's left edge, and can't be clipped by an ancestor's overflow
     either. #history wraps just the chat list, not the whole sidebar. */
  box-shadow: inset 3px 0 0 0 rgba(16, 163, 127, 0.6) !important;
  transition: box-shadow 0.15s ease-out !important;
}
`;
