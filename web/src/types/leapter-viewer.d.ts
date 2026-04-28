declare namespace JSX {
  interface IntrinsicElements {
    "leapter-logic-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        logic?: string;
        "logic-origin"?: string;
        trace?: string;
        frame?: boolean;
        // Both default to `true` on <leapter-logic-viewer> (embed-first).
        // Set to "false" (string) to reveal — the viewer's custom Lit
        // converter parses "false" as false.
        "hide-data-panel"?: boolean | "true" | "false";
        "hide-minimap"?: boolean | "true" | "false";
        "show-descriptions"?: boolean;
        "show-expressions"?: boolean;
      },
      HTMLElement
    >;
  }
}
