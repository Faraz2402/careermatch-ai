/** Runs before paint (inlined in <head>) so there is no flash of the wrong theme. */
export const THEME_KEY = "cm-theme";
// Obsidian (dark) is the default; an older "system" choice resolves to the OS setting.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="system")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;
