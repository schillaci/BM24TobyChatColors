javascript:

/************************************************************************************
BitMarket24.pl chat fix.
Updated on 2017-12-12. By user Toby @ BitMarket24.pl.
Works in current Chrome. Reportedly also in Firefox.
Screenshot: https://i.imgur.com/qDD3Iaw.png

No rights reserved. The code is harmless to the author's best knowledge 
but the author gives no guarantees of any kind and he takes no legal responsibility 
for effects of the code. End user is free to modify and redistribute the code 
to his or her satisfaction. Autor postarał się, żeby nie było błędów w tym kodzie, 
ale nie bierze odpowiedzialności za złe działanie kodu. 

INSTRUKCJA: 
1) Opcjonalnie: wyedytować ustawienia użytkownika w sekcji 'settings'.
2) Zainstalować jako zakładkę w przeglądarce. Tekst kodu wkleić jako URL.
   Jako tytuł można wpisać "BM24 czat fix". 
   Ilustracja: https://i.imgur.com/7p2zzxV.png
3) Kiedy zakładka jest już utworzona, należy włączyć okno Bitmarket24 
   i wybrać tą zakładkę. 
************************************************************************************/

/*** Universal functions ***/

function hash(str) { 
    /* https://github.com/darkskyapp/string-hash */ 
    /* http://www.cse.yorku.ca/~oz/hash.html */
    var hash0 = 5381, i = str.length; 
    while (i) hash0 = (hash0 * 33) ^ str.charCodeAt(--i); 
    return hash0 >>> 0; /* a number between 0 and 4294967295 (inclusive) */ 
} /* 2017-12-03 */

function LCG(seed) { /* pseudo-RNG */
    /* https://stackoverflow.com/a/47593316/6314667 */
    function lcg(a) {return a * 48271 % 2147483647}
    seed = seed ? lcg(seed) : lcg(Math.random());
    return function() {return (seed = lcg(seed)) / 2147483648};
}

function updateElement(tag, id, innerHTML, adjacent, how = "afterbegin") {
    var el = document.getElementById(id) || document.createElement(tag);
    Object.assign(el, {id, innerHTML});
    if (adjacent) adjacent.insertAdjacentElement(how, el);
    return el;
} /* 2017-11-20 */

/*** Toby's Bitmarket24 chat functions ***/

var settings = { /* Użytkownik może edytować tą sekcję. */
    NICKHUESALT: 0, /* generator palety (dowolna liczba) */
    NICKSATLIGHT: "100%, 40%", /* nasycenie i jasność kolorów */
    NICKCOLORS: {"DJPloki": 120, "twójNickTutaj": "0"}, /* tęcza od "0" do 360 */
    COLORDELAY: 90, /* co ile sekund przydzielane są kolory */
    CHATWIDTH: "40%", CHATMARGINERROR: "100px", /* Jeśli wszystko działa dobrze,
        należy zmniejszyć CHATMARGINERROR do "0px". */
    SOUND1: new Audio("data") 
};

function colorChat() {
    var usernick = (document.querySelector(".user-nick") || "").innerText.slice(1,-1);
    var hueFromNick = nick => settings.NICKCOLORS[nick] /* for 0 use string "0" */ ||
        Math.floor(360 * LCG((settings.NICKHUESALT ^ hash(nick)) >>> 0)());
    var colorFromNick = nick => `hsl(${hueFromNick(nick)}, ${settings.NICKSATLIGHT})`;
    var styleFromNick = nick => `#chat span.nick[data-nick="${nick}"], ` + 
        `#chat span.nick[data-nick="${nick}"] ~ span {color: ${colorFromNick(nick)};}`;
    var nicknames = document.getElementsByClassName("nick");
    nicknames = [...nicknames].map(o => o.innerHTML.slice(0,-1));
    nicknames = [...new Set(nicknames)].sort(); /* deduplicate & sort */
    var stylesheet = `#chat span.nick[data-nick="${usernick}"], ` + 
        ".bold {text-shadow: 0px 0px 2em;}\n" + 
        nicknames.map(styleFromNick).join("\n");
    updateElement("STYLE", "toby-chat-colors", stylesheet, document.head);
} /* 2017-12-09 */

function createTabCycleInfo(chatmsgbox) {
    var j = {};
    j.caretPos = chatmsgbox.selectionStart;
    var wordsliceEx = chatmsgbox.value /* with leading "@" and trailing ", " */
        .slice(0, j.caretPos).match(/@?[^\s]+(, )?$/);
    j.wordsliceExStart = wordsliceEx ? wordsliceEx.index : j.caretPos;
    j.wordslice = wordsliceEx && wordsliceEx[0].replace(/^@|, $/, "");
    j.matchingIndex = 0;
    return j;
} /* 2017-12-10 */

function expandNicknameOnTab(e) { /* Nickname autocomplete. */
    if (e.code === "Tab") e.preventDefault();
    var chatmsgbox = document.getElementById("chat-message");
    var i = JSON.parse(chatmsgbox.getAttribute("TabCycleInfo") || "{}");
    var j = createTabCycleInfo(chatmsgbox);
    if (i.caretPos !== j.caretPos) {i = j;}
    if (!i.wordslice) return chatmsgbox.removeAttribute("TabCycleInfo");
    if (e.code !== "Tab") return;
    var nicknames = [...new Set([...document.getElementsByClassName("nick")]
        .map(o => o.innerHTML.slice(0,-1)))].sort();
    var isSliceInName = name => name.match(new RegExp("^" + i.wordslice, "i"));
    var matchingnames = nicknames.filter(isSliceInName);
    i.matchingIndex = (1 + matchingnames.indexOf(j.wordslice /* j, not i! */)) % 
      matchingnames.length; /* nickname cycling */
    if (!matchingnames.length) return chatmsgbox.removeAttribute("TabCycleInfo");
    chatmsgbox.value = chatmsgbox.value.slice(0, i.wordsliceExStart) + 
        (i.wordsliceExStart ? "@" : "") + matchingnames[i.matchingIndex] + 
        (i.wordsliceExStart ? "" : ", ") + chatmsgbox.value.slice(i.caretPos);
        /* Now appends ", " (comma and space) to nickname 
        if first word in message. Otherwise prepends it with "@". */
    chatmsgbox.selectionEnd = i.caretPos = (i.wordsliceExStart || 1) + 1 + 
        matchingnames[i.matchingIndex].length;
    chatmsgbox.setAttribute("TabCycleInfo", JSON.stringify(i));
} /* 2017-12-10 */

function setChatWidth(w = "30%") {
    var row = [...document.getElementsByClassName("row")]
        .find(row => row.querySelector("#chat"));
    var [chart0, chat0] = row ? row.querySelectorAll(".span12, .span4") : [];
    if (!chart0 || !chat0) return -1;
    chat0.style.width = w;
    var fromPercentage = str => 
        parseFloat((str.match(/^([0-9.]+)%$/) || [])[1]) / 100;
    var g = (el, p) => parseInt(getComputedStyle(el)[p]);
    var margin = g(chat0, "width") + g(chart0, "marginLeft") +
        Math.max(g(chart0, "marginRight"), g(chat0, "marginLeft")) -
        fromPercentage(w) * g(row, "width");
    chart0.style.width = `calc(100% - ${w} - ${Math.ceil(margin)}px - ${settings.CHATMARGINERROR})`;
} /* 2017-12-12 */

function unloadChatFix() { /* returns truthy value on error */
    var style = document.getElementById("toby-chat-colors");
    if (style) style.remove();
    var chatmsgbox = document.getElementById("chat-message");
    if (!chatmsgbox) return -1;
    chatmsgbox.removeEventListener("keydown", window.expandNicknameOnTab_, false);
    if (window.ivColor) {
        clearInterval(window.ivColor); 
        console.log("Old interval", window.ivColor, "(ivColor) unloaded.");
    }
    /* return setChatWidth(); /* breaks layout for some people, 2017-12-13 */
} /* 2017-12-10 */

function loadChatFix() { /* returns truthy value on error */
    var chatmsgbox = document.getElementById("chat-message");
    if (!chatmsgbox) return -1;
    chatmsgbox.addEventListener("keydown", expandNicknameOnTab, false);
    window.expandNicknameOnTab_ = expandNicknameOnTab;
    colorChat(); window.ivColor = setInterval(colorChat, 1000 * settings.COLORDELAY);
    console.log("window.ivColor ==", window.ivColor);
    return setChatWidth(settings.CHATWIDTH, settings.CHATMARGIN); /* 2017-12-13 */
} /* 2017-12-10 */

if (document.location.host !== "bitmarket24.pl" || unloadChatFix() || loadChatFix())
    alert("Nie rozpoznano środowiska Bitmarket24.\nBitmarket24 environment not found.");
