/** Google's own AI Mode (udm=50). It runs on Google, so it never uses CareerMatch AI actions. */
export const googleAiUrl = (q: string) => `https://www.google.com/search?udm=50&q=${encodeURIComponent(q)}`;
export const googleUrl = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
