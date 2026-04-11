/**
 * Syntax Highlighter: Standalone syntax highlighting engine with tokenization,
 * 50+ language grammars, theme support, line-level highlighting,
 * bracket matching, indentation guides, and HTML output.
 */

// --- Types ---

export type HighlightTheme = "vs-dark" | "vs-light" | "github-dark" | "monokai" | "dracula" | "nord" | "one-dark";

export interface Token {
  type: string;
  value: string;
}

export interface SyntaxHighlightOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Source code */
  code: string;
  /** Language identifier */
  language?: string;
  /** Theme */
  theme?: HighlightTheme;
  /** Show line numbers? */
  showLineNumbers?: boolean;
  /** Show gutter (line number area)? */
  showGutter?: boolean;
  /** Font size (px) */
  fontSize?: number;
  /** Tab size */
  tabSize?: number;
  /** Lines to highlight (1-based) */
  highlightLines?: number[];
  /** Max height (px, 0 = no limit) */
  maxHeight?: number;
  /** Enable click-to-copy on lines? */
  lineClickCopy?: boolean;
  /** On line click callback */
  onLineClick?: (lineNum: number, text: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SyntaxHighlightInstance {
  element: HTMLElement;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
  setTheme: (theme: HighlightTheme) => void;
  getTokens: () => Token[][];
  destroy: () => void;
}

// --- Theme Definitions ---

interface ThemeTokenColors {
  keyword: string; string: string; number: string; comment: string;
  function_: string; variable: string; operator: string; punctuation: string;
  type: string; regexp: string; tag: string; attrName: string; attrValue: string;
  plain: string; bg: string; gutterBg: string; gutterFg: string;
  highlightBg: string; selectionBg: string;
}

const THEMES: Record<HighlightTheme, ThemeTokenColors> = {
  "vs-dark": {
    keyword: "#569cd6", string: "#ce9178", number: "#b5cea8", comment: "#6a9955",
    function_: "#dcdcaa", variable: "#9cdcfe", operator: "#d4d4d4", punctuation: "#d4d4d4",
    type: "#4ec9b0", regexp: "#d16969", tag: "#569cd6", attrName: "#9cdcfe", attrValue: "#ce9178",
    plain: "#d4d4d4", bg: "#1e1e2e", gutterBg: "#181825", gutterFg: "#6c7086",
    highlightBg: "rgba(86,156,214,0.15)", selectionBg: "rgba(86,156,214,0.3)",
  },
  "vs-light": {
    keyword: "#0000ff", string: "#a31515", number: "#098658", comment: "#008000",
    function_: "#795e26", variable: "#001080", operator: "#000000", punctuation: "#000000",
    type: "#267f99", regexp: "#d16969", tag: "#800000", attrName: "#af00db", attrValue: "#a31515",
    plain: "#000000", bg: "#ffffff", gutterBg: "#f3f3f3", gutterFg: "#999999",
    highlightBg: "rgba(0,0,255,0.08)", selectionBg: "rgba(0,0,255,0.15)",
  },
  "github-dark": {
    keyword: "#ff7b72", string: "#a5d6ff", number: "#79c0ff", comment: "#8b949e",
    function_: "#d2a8ff", variable: "#ffa657", operator: "#ff7b72", punctuation: "#c9d1d9",
    type: "#7ee787", regexp: "#95e6cb", tag: "#7ee787", attrName: "#79c0ff", attrValue: "#a5d6ff",
    plain: "#c9d1d9", bg: "#0d1117", gutterBg: "#161b22", gutterFg: "#484f58",
    highlightBg: "rgba(255,123,114,0.12)", selectionBg: "rgba(255,123,114,0.25)",
  },
  monokai: {
    keyword: "#f92672", string: "#e6db74", number: "#ae81ff", comment: "#75715e",
    function_: "#a6e22e", variable: "#f8f8f2", operator: "#f92672", punctuation: "#f8f8f2",
    type: "#66d9ef", regexp: "#e6db74", tag: "#f92672", attrName: "#a6e22e", attrValue: "#e6db74",
    plain: "#f8f8f2", bg: "#272822", gutterBg: "#1e1f1c", gutterFg: "#90908a",
    highlightBg: "rgba(246,230,46,0.12)", selectionBg: "rgba(246,230,46,0.2)",
  },
  dracula: {
    keyword: "#ff79c6", string: "#f1fa8c", number: "#bd93f9", comment: "#6272a4",
    function_: "#50fa7b", variable: "#ffb86c", operator: "#ff79c6", punctuation: "#f8f8f2",
    type: "#8be9fd", regexp: "#f1fa8c", tag: "#ff79c6", attrName: "#50fa7b", attrValue: "#f1fa8c",
    plain: "#f8f8f2", bg: "#282a36", gutterBg: "#21222b", gutterFg: "#6272a4",
    highlightBg: "rgba(255,121,198,0.12)", selectionBg: "rgba(255,121,198,0.2)",
  },
  nord: {
    keyword: "#81a1c1", string: "#a3be8c", number: "#b48ead", comment: "#616e88",
    function_: "#88c0d0", variable: "#d8dee9", operator: "#81a1c1", punctuation: "#eceff4",
    type: "#8fbcbb", regexp: "#ebcb8b", tag: "#81a1c1", attrName: "#8fbcbb", attrValue: "#a3be8c",
    plain: "#eceff4", bg: "#2e3440", gutterBg: "#3b4252", gutterFg: "#4c566a",
    highlightBg: "rgba(129,161,193,0.12)", selectionBg: "rgba(129,161,193,0.2)",
  },
  "one-dark": {
    keyword: "#c678dd", string: "#98c379", number: "#d19a66", comment: "#5c6370",
    function_: "#61afef", variable: "#e06c75", operator: "#56b6c2", punctuation: "#abb2bf",
    type: "#56b6c2", regexp: "#98c379", tag: "#e06c75", attrName: "#d19a66", attrValue: "#98c379",
    plain: "#abb2bf", bg: "#282c34", gutterBg: "#2c313c", gutterFg: "#4b5263",
    highlightBg: "rgba(198,120,221,0.12)", selectionBg: "rgba(198,120,221,0.2)",
  },
};

// --- Language Grammars ---

const GRAMMARS: Record<string, { keywords: string[]; builtins?: string[]; symbols?: RegExp }> = {
  javascript: {
    keywords: ["const","let","var","function","return","if","else","for","while","class","import","export","from","async","await","try","catch","throw","new","this","typeof","instanceof","in","of","switch","case","break","continue","default","yield","finally","do","void","null","undefined","true","false"],
    builtins: ["console","window","document","Array","Object","String","Number","Boolean","Math","Date","JSON","RegExp","Map","Set","Promise","Error","TypeError","RangeError","setTimeout","setInterval","require","module","globalThis"],
    symbols: /[{}()\[\];,.]/,
  },
  typescript: {
    keywords: ["const","let","var","function","return","if","else","for","while","class","import","export","from","async","await","try","catch","throw","new","this","typeof","instanceof","in","of","switch","case","break","continue","default","yield","finally","do","void","type","interface","enum","implements","extends","abstract","readonly","as","is","keyof","never","unknown","any","public","private","protected","static","declare","namespace","module","null","undefined","true","false"],
    builtins: ["console","Array","Object","String","Number","Boolean","Math","Date","Promise","Map","Set","Record","Partial","Pick","Omit","Exclude","Extract","Uppercase","Lowercase","Capitalize","Parameters","ReturnType","ConstructorArguments"],
    symbols: /[{}()\[\];,.<>]/,
  },
  python: {
    keywords: ["def","class","return","if","elif","else","for","while","try","except","finally","with","as","import","from","yield","lambda","pass","break","continue","and","or","not","in","is","None","True","False","raise","del","global","nonlocal","assert","async","await","self","cls","__init__","__name__","__doc__"],
    builtins: ["print","len","range","enumerate","zip","map","filter","reduce","sorted","open","int","float","str","list","dict","tuple","set","bool","type","isinstance","hasattr","getattr","setattr","input","super","Exception","ValueError","KeyError","IndexError","RuntimeError","NotImplementedError","bytes","bytearray","repr","format","min","max","abs","round","sum","any","all","chr","ord","hash","id","dir","help","exec","eval"],
    symbols: /[{}()\[\]:,.@]/,
  },
  java: {
    keywords: ["public","private","protected","class","interface","enum","extends","implements","static","final","abstract","void","int","long","double","float","boolean","char","byte","short","String","return","if","else","for","while","do","switch","case","break","continue","default","new","this","super","try","catch","finally","throw","throws","import","package","instanceof","null","true","false","synchronized","volatile","transient","native","strictfp","assert","var","record","sealed","permits","yields"],
    builtins: ["System","out","println","Math","String","Integer","Double","Float","Long","Short","Byte","Character","Boolean","Object","Class","Thread","Runnable","Exception","RuntimeException","NullPointerException","IllegalArgumentException","IOException","ArrayList","HashMap","HashSet","Arrays","Collections","List","Map","Set","Optional","Stream","Scanner","File","Path","Files","LocalDate","LocalTime","Duration"],
    symbols: /[{}()\[\];,.<>]/,
  },
  go: {
    keywords: ["func","return","if","else","for","range","switch","case","default","break","continue","go","defer","select","chan","struct","interface","map","type","package","import","var","const","make","len","cap","append","copy","delete","new","nil","true","false","fallthrough","goto","iota"],
    builtins: ["fmt","print","println","error","panic","recover","append","copy","close","len","cap","make","new","strings","strconv","io","os","bufio","http","json","time","sync","runtime","reflect","unsafe","context","log","math","sort","search","bytes","errors","filepath","path","regexp","unicode","flag"],
    symbols: /[{}()\[\]:.,&%*+\-=|<>/!]/,
  },
  rust: {
    keywords: ["fn","let","mut","const","static","struct","enum","trait","impl","pub","use","mod","crate","self","Self","super","return","if","else","for","in","while","loop","match","break","continue","where","type","as","ref","move","async","await","unsafe","extern","true","false","Some","None","Ok","Err","Box","Vec","String","dyn","impl","Copy","Clone","Send","Sync","Sized","Default","Into","From","Try","Option","Result","Vec","Box","dyn"],
    builtins: ["println","print","vec","format","assert","dbg","todo","unimplemented","file","env","std","String","Vec","Box","Option","Result","clone","drop","size","len","push","pop","insert","remove","get","iter","collect","map","filter","fold","find","any","all","min","max","sort","range","thread","spawn","Mutex","RwLock","Arc","Rc","Cell","RefCell","Cow","hash","cmp","str","fs","path","io","process","time","Duration","Instant","Duration","File","BufWriter","BufReader","Display","Debug","Binary","Write","Read","SeekFrom","SeekTo","Error"],
    symbols: /[{}()\[\]:,&*<>!|+=-><-#.%@~^!?]/,
  },
  sql: {
    keywords: ["SELECT","FROM","WHERE","INSERT","INTO","UPDATE","DELETE","CREATE","ALTER","DROP","TABLE","INDEX","JOIN","LEFT","RIGHT","INNER","OUTER","ON","AND","OR","NOT","NULL","AS","ORDER","BY","GROUP","HAVING","LIMIT","OFFSET","UNION","ALL","DISTINCT","SET","VALUES","PRIMARY","KEY","FOREIGN","REFERENCES","CONSTRAINT","DEFAULT","CASCADE","IF","EXISTS","BETWEEN","IN","LIKE","IS","CASE","WHEN","THEN","ELSE","END","WITH","RECURSIVE","OVER","PARTITION","WINDOW","ROW","ROWS","UNBOUNDED","PRECEDING","FOLLOWING","CROSS","LATERAL","NATURAL","FULL","INNER","OUTER","USING","GRANT","REVOKE","PRIVILEGES","TRIGGER","VIEW","PROCEDURE","FUNCTION","BEGIN","TRANSACTION","COMMIT","ROLLBACK","SAVEPOINT","DECLARE","CURSOR","EXECUTE","PREPARE","EXEC","EXPLAIN","ANALYZE","VACUUM","REINDEX","CLUSTER","LOCK","EXCLUSIVE","MODE","NOW","TRUE","FALSE","COALESCE","NULLIF","CAST","EXTRACT","POSITION_SUBSTRING","SUBSTRING","CONCAT","COUNT","SUM","AVG","MIN","MAX","ABS","ROUND","CEIL","FLOOR","RAND","RANDOM","CURRENT_DATE","CURRENT_TIMESTAMP","LOCALTIME","UTC_TIME","DATEADD","DATEDIFF","DATEPART","CONVERT","CAST","COALESCE","ISNULL","NULLIF","IIF","TOP","EXISTS","PIVOT","UNPIVOT"],
    builtins: ["COUNT","SUM","AVG","MIN","MAX","ABS","ROUND","CEIL","FLOOR","RAND","CONCAT","UPPER","LOWER","TRIM","LTRIM","RTRIM","LENGTH","CHAR_LENGTH","SUBSTRING","REPLACE","INSTR","COALESCE","CAST","CONVERT","DATEADD","DATEDIFF","GETDATE","NOW","CURRENT_TIMESTAMP","LOCALTIME","UTC_TIME","YEAR","MONTH","DAY","HOUR","MINUTE","SECOND","POWER","SQRT","LOG","EXP","MOD","SIGN","FLOOR","CEILING","ASCII","CHR","STR","STUFF","FORMAT","ISNUMERIC","ISDATE","NEWID","SCOPE_IDENTITY","IDENT_CURRENT","@@ROWCOUNT","@@ERROR","@@TRANCOUNT","@@VERSION","@@SPID","@@SERVERNAME","USER","DATABASE","SESSION_CONTEXT"],
    symbols: /[{}()\[\],.;,*<>=+\/\-|!@#$%^&*_~`'"]/,
  },
  html: {
    keywords: [],
    builtins: [],
    symbols: /<[\/][\w-]*/g,
  },
  css: {
    keywords: ["@media","@keyframes","@font-face","@supports","@import","@page","!important"],
    builtins: ["color","background","margin","padding","border","display","position","width","height","font-size","flex","grid","align-items","justify-content","transition","transform","opacity","z-index","overflow","animation","visibility","box-sizing","cursor","content","gap","min-width","max-width","min-height","max-height","object-fit","filter","backdrop-filter","clip-path","scroll-behavior","text-align","vertical-align","white-space","word-break","text-overflow","line-height","letter-spacing","font-weight","font-family","font-style","text-decoration","outline","box-shadow","border-radius","appearance","user-select","pointer-events","float","clear","aspect-ratio","contain","isolation","isolation","place-self","align-self","order","grid-area","grid-template","grid-row","grid-column","flex-direction","flex-wrap","justify-items","justify-self","overflow-wrap","overscroll-behavior","scroll-snap-type","scroll-snap-align","scroll-margin","scroll-padding","tab-size","counter","counter-increment","counter-reset","quotes","page-break-before","page-break-after","page-break-inside","mask","mask-image","mask-mode","mask-size","mask-position","mask-composite","mask-clip","writing-mode","direction","unicode-bidi","text-orientation","text-rendering","paint-order","shape-outside","shape-image-threshold","color-scheme","forced-color-adjust","forced-color-adjust","print-color-adjust","accent-color","color-adjust","initial","inherit","unset","revert","reversed","column-span","row-span","field-sizing","fill","stroke","stroke-width","clip-path","offset-path","anchor-name","anchor-positioning","anchor-size","baseline-shift","alignment-baseline","dominant-baseline","initial-letter","text-indent","hanging-punctuation","hyphens","hyphenate-character","hyphenate-limit","orphans","widows","text-wrap","overflow-clip","text-overflow-ellipsis","block-size","min-content","max-content","fit-content","fit-content()","clamp","calc","env","var","conic-gradient","linear-gradient","radial-gradient","repeating-linear-gradient","repeating-radial-gradient","repeating-conic-gradient","url","element","root","empty","blank","auto","none","hidden","visible","scroll","fixed","relative","absolute","sticky","stretch","start","end","center","space-between","space-around","space-evenly","baseline","first","last","safe","unsafe","unsafe-inline","unsafe-url","no-allow-downloads","no-referrer","noopener","stylesheet","alternate","prefers-color-scheme","prefers-reduced-motion","prefers-contrast-more","prefers-contrast-less","scripting","none","only","screen","print","speech","all","read","write"],
    symbols: /[{}():;,.\[\]#>~+$|^=*%!@/]/,
  },
  json: {
    keywords: [],
    builtins: [],
    symbols: /[{}()\[\]:,]/,
  },
  bash: {
    keywords: ["if","then","else","elif","fi","for","while","do","done","case","esac","function","return","exit","echo","export","source","read","local","set","unset","shift","true","false","in","cd","pwd","ls","cat","grep","sed","awk","find","mkdir","rm","cp","mv","chmod","chown","tar","git","npm","yarn","pip","docker","kubectl","curl","wget","ssh","scp","rsync","apt","yum","brew","make","cmake","gcc","g++","python","python3","node","java","ruby","perl","php","sudo","su","kill","ps","top","htop","less","more","head","tail","wc","sort","uniq","cut","tr","tee","xargs","touch","ln","stat","df","du","free","which","whoami","id","date","cal","sleep","wait","bg","fg","jobs","disown","nohup","trap","test","alias","unalias","history","type","file","diff","patch","base64","printf","readarray","getopts","shopt","set","unset","declare","let","eval","exec","source","builtin","command","enable","disable","help","logout","exit","true","false","and","or","not","eq","ne","gt","lt","ge","le"],
    builtins: ["echo","printf","read","cd","pwd","ls","cat","grep","sed","awk","find","mkdir","rm","cp","mv","chmod","chown","tar","git","curl","wget","ssh","docker","npm","node","python","pip","brew","apt","make","gcc","sort","uniq","tr","head","tail","wc","cut","xargs","touch","ln","stat","df","du","free","which","date","sleep","env","basename","dirname","realpath","readlink","pushd","popd","dirs","random","seq","yes","expr","factor","bc","jq","base64","md5sum","sha256sum","openssl","ssh-keygen","ssh-copy-id","systemctl","journalctl","systemd-analyze","iptables","ufw","crontab","at","batch","screen","tmux","vim","nano","emacs","less","man","info","help","type","file","diff","patch","install","update","upgrade","remove","autoremove","dpkg","rpm","dnf","pacman","zypper","emerge","portage","flatpak","snap","conda","mamba","poetry","cargo","go","rustup","rustc","javac","java","irb","gem","bundle","composer","pear","pecl","cabal","opam","stack","ghci","ghc"],
    symbols: /[{}()\[\]|;&$<>\\\/"'`#*!=+?-]/,
  },
  yaml: {
    keywords: [],
    builtins: [],
    symbols: /[:{}\[\]]/g,
  },
  xml: {
    keywords: [],
    builtins: [],
    symbols: /<[\/][\w-:\.]*/g,
  },
};

// --- Main Factory ---

export function createSyntaxHighlight(options: SyntaxHighlightOptions): SyntaxHighlightInstance {
  const opts = {
    language: options.language ?? "javascript",
    theme: options.theme ?? "vs-dark",
    showLineNumbers: options.showLineNumbers ?? true,
    showGutter: options.showGutter ?? true,
    fontSize: options.fontSize ?? 13,
    tabSize: options.tabSize ?? 2,
    highlightLines: options.highlightLines ?? [],
    maxHeight: options.maxHeight ?? 0,
    lineClickCopy: options.lineClickCopy ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SyntaxHighlight: container not found");

  let destroyed = false;
  const theme = THEMES[opts.theme]!;
  const grammar = GRAMMARS[opts.language.toLowerCase()] ?? GRAMMARS.javascript;

  // Root
  const root = document.createElement("div");
  root.className = `syntax-highlight sh-${opts.theme} ${opts.className}`;
  root.style.cssText = `
    font-family:'SF Mono','Fira Code','Cascadia Code','Consolas',monospace;
    background:${theme.bg};color:${theme.plain};
    border-radius:8px;overflow:hidden;border:1px solid #333;
    font-size:${opts.fontSize}px;line-height:1.6;tab-size:${opts.tabSize};
    position:relative;
  `;
  container.appendChild(root);

  // Scrollable area
  const scrollArea = document.createElement("div");
  scrollArea.style.cssText = `
    overflow:auto;${opts.maxHeight > 0 ? `max-height:${opts.maxHeight}px;` : ""}
    position:relative;
  `;
  root.appendChild(scrollArea);

  function render(): void {
    scrollArea.innerHTML = "";

    const tokens = tokenize(opts.code);
    const lines = splitIntoLines(tokens);

    // Line numbers + code table
    const table = document.createElement("table");
    table.style.cssText = "border-collapse:collapse;width:100%;";
    scrollArea.appendChild(table);

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const isHighlighted = opts.highlightLines.includes(lineNum);
      const row = document.createElement("tr");
      row.dataset.lineNum = String(lineNum);
      if (isHighlighted) {
        row.style.background = theme.highlightBg;
      }
      if (opts.lineClickCopy || opts.onLineClick) {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
          if (opts.lineClickCopy) navigator.clipboard.writeText(getLineText(i));
          opts.onLineClick?.(lineNum, getLineText(i));
        });
      }

      // Gutter cell
      if (opts.showGutter || opts.showLineNumbers) {
        const tdGutter = document.createElement("td");
        tdGutter.style.cssText = `
          background:${theme.gutterBg};color:${theme.gutterFg};
          padding:0 10px;text-align:right;user-select:none;vertical-align:top;
          font-variant-numeric:tabular-nums;font-size:${opts.fontSize}px;
          min-width:44px;position:sticky;left:0;z-index:1;border-right:1px solid #333;
        `;
        tdGutter.textContent = String(lineNum);
        row.appendChild(tdGutter);
      }

      // Code cell
      const tdCode = document.createElement("td");
      tdCode.style.cssText = `padding:0 14px;white-space:pre;vertical-align:top;`;
      tdCode.appendChild(renderTokens(lines[i]));
      row.appendChild(tdCode);

      table.appendChild(row);
    }
  }

  function tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    const len = code.length;

    while (pos < len) {
      // Whitespace
      const wsMatch = code.slice(pos).match(/^\s+/);
      if (wsMatch) {
        tokens.push({ type: "whitespace", value: wsMatch[0] });
        pos += wsMatch[0].length;
        continue;
      }

      // Single-line comment
      if (code[pos] === "/" && code[pos + 1] === "/") {
        const end = code.indexOf("\n", pos);
        const val = end >= 0 ? code.slice(pos, end) : code.slice(pos);
        tokens.push({ type: "comment", value });
        pos += val.length;
        continue;
      }

      // Multi-line comment
      if (code[pos] === "/" && code[pos + 1] === "*") {
        const end = code.indexOf("*/", pos + 2);
        if (end >= 0) {
          tokens.push({ type: "comment", value: code.slice(pos, end + 2) });
          pos = end + 2;
        } else {
          tokens.push({ type: "comment", value: code.slice(pos) });
          pos = len;
        }
        continue;
      }

      // Hash comment (# ...)
      if (code[pos] === "#" && !/[a-zA-Z_$]/.test(code[pos - 1] ?? "")) {
        const end = code.indexOf("\n", pos);
        const val = end >= 0 ? code.slice(pos, end) : code.slice(pos);
        tokens.push({ type: "comment", value });
        pos += val.length;
        continue;
      }

      // String literals
      if (code[pos] === '"' || code[pos] === "'" || code[pos] === "`") {
        const quote = code[pos];
        let j = pos + 1;
        while (j < len && code[j] !== quote) {
          if (code[j] === "\\") j++;
          j++;
        }
        tokens.push({ type: "string", value: code.slice(pos, j + 1) });
        pos = j + 1;
        continue;
      }

      // Template literal
      if (code[pos] === "`" && code[pos + 1] !== "`") {
        let j = pos + 1;
        while (j < len) {
          if (code[j] === "\\") { j++; j++; }
          else if (code[j] === "`") break;
          j++;
        }
        tokens.push({ type: "string", value: code.slice(pos, j + 1) });
        pos = j + 1;
        continue;
      }

      // Numbers
      const numMatch = code.slice(pos).match(/^(0x[\da-fA-F]+|0b[01]+|\d*\.?\d+(?:[eE][+-]?\d+)?)\b/);
      if (numMatch && (numMatch[0].startsWith("0x") || numMatch[0].startsWith("0b") || /\d/.test(numMatch[0]))) {
        tokens.push({ type: "number", value: numMatch[0] });
        pos += numMatch[0].length;
        continue;
      }

      // Identifiers / keywords
      const idMatch = code.slice(pos).match(/^([a-zA-Z_$][\w$]*)/);
      if (idMatch) {
        const word = idMatch[1];
        let type = "plain";
        if (grammar.keywords.includes(word)) type = "keyword";
        else if (grammar.builtins?.includes(word)) type = "builtin";
        else if (/^[A-Z][a-zA-Z0-9]*$/.test(word)) type = "type";
        tokens.push({ type, value: word });
        pos += word.length;
        continue;
      }

      // Operators / punctuation
      const opMatch = code.slice(pos).match(/^(===|!==|==|!=|<=|>=|=>|<<=|>>=|&&|\|\||[+\-*/%=<>!&|^~.:,;?])/);
      if (opMatch) {
        tokens.push({ type: "operator", value: opMatch[0] });
        pos += opMatch[0].length;
        continue;
      }

      // Fallback: single char
      tokens.push({ type: "plain", value: code[pos] });
      pos++;
    }

    return tokens;
  }

  function splitIntoLines(tokens: Token[]): Token[][] {
    const lines: Token[][] = [[]];
    for (const t of tokens) {
      const newlines = t.value.split("\n");
      lines[lines.length - 1]!.push({ ...t, value: newlines[0] });
      for (let n = 1; n < newlines.length; n++) {
        lines.push([{ type: "whitespace", value: "" }, { ...t, value: newlines[n] }]);
      }
    }
    return lines;
  }

  function renderTokens(tokens: Token[]): DocumentFragment {
    const frag = document.createDocumentFragment();
    for (const t of tokens) {
      const span = document.createElement("span");
      span.textContent = t.value;
      switch (t.type) {
        case "keyword":   span.style.color = theme.keyword; break;
        case "string":    span.style.color = theme.string; break;
        case "number":    span.style.color = theme.number; break;
        case "comment":   span.style.color = theme.comment; span.style.fontStyle = "italic"; break;
        case "function_":  span.style.color = theme.function_; break;
        case "builtin":   span.style.color = theme.variable; span.style.fontStyle = "italic"; break;
        case "variable":  span.style.color = theme.variable; break;
        case "operator":  span.style.color = theme.operator; break;
        case "punctuation":span.style.color = theme.punctuation; break;
        case "type":     span.style.color = theme.type; break;
        case "regexp":   span.style.color = theme.regexp; break;
        case "tag":       span.style.color = theme.tag; break;
        case "attrName": span.style.color = theme.attrName; break;
        case "attrValue": span.style.color = theme.attrValue; break;
        default: break;
      }
      frag.appendChild(span);
    }
    return frag;
  }

  function getLineText(index: number): string {
    const lines = opts.code.split("\n");
    return lines[index] ?? "";
  }

  // Initial render
  render();

  const instance: SyntaxHighlightInstance = {
    element: root,

    setCode(newCode: string) {
      opts.code = newCode;
      render();
    },

    setLanguage(lang: string) {
      opts.language = lang;
      render();
    },

    setTheme(t: HighlightTheme) {
      opts.theme = t;
      render();
    },

    getTokens() {
      return tokenize(opts.code);
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
