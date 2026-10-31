/** Runs before paint (inlined in <head>) so there is no flash of the wrong theme. */
export const THEME_KEY = "cm-theme";
// Obsidian (dark) is the default; "system" follows the OS.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;else if(t!=="system")document.documentElement.dataset.theme="dark"}catch(e){document.documentElement.dataset.theme="dark"}`;
