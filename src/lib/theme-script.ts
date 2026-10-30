/** Runs before paint (inlined in <head>) so there is no flash of the wrong theme. */
export const THEME_KEY = "cm-theme";
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
