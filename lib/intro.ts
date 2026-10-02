// Shared by the server layout and the client intro.
export const INTRO_SEEN_KEY = "askesis:intro";

/** Runs before first paint so returning tabs never flash the black intro. */
export const introHeadScript = `try{if(sessionStorage.getItem("${INTRO_SEEN_KEY}"))document.documentElement.classList.add("intro-seen")}catch(e){}`;
