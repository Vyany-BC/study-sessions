// Shared behavior for every chapter page.
//   1. Formulas: LaTeX rendered by KaTeX (loaded in the page head).
//   2. Diagrams: Mermaid, written as <pre class="mermaid">...</pre>.
//   3. Code: editable and runnable Python (Pyodide), written as <pre class="py-run">...</pre>.
//      Optional shared helpers go in <pre class="py-setup">...</pre> (hidden, runs once before any block).

const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@10.9.3/dist/mermaid.esm.min.mjs";
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

/* ---------- 1. Formulas ---------- */
function renderMath() {
  if (typeof renderMathInElement !== "function") return;
  renderMathInElement(document.body, {
    delimiters: [
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
    ],
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    throwOnError: false,
  });
}

/* ---------- 2. Diagrams ---------- */
async function renderDiagrams() {
  const nodes = document.querySelectorAll("pre.mermaid");
  if (!nodes.length) return;
  try {
    const { default: mermaid } = await import(MERMAID_URL);
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        primaryColor: "#ebe8fb",
        primaryBorderColor: "#5a52a8",
        primaryTextColor: "#22204a",
        lineColor: "#5a52a8",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      },
    });
    await mermaid.run({ nodes });
  } catch (error) {
    console.error(error);
    nodes.forEach((node) => {
      node.insertAdjacentHTML("afterend", '<p class="runner-error">The diagram could not be loaded. Check your connection.</p>');
    });
  }
}

/* ---------- 3. Runnable Python ---------- */
let pyodidePromise = null;
let setupDone = false;

// Hidden helper code (<pre class="py-setup">) that runs once before any block, so blocks can share functions and data.
const setupCode = Array.from(document.querySelectorAll("pre.py-setup"))
  .map((node) => node.textContent)
  .join("\n");
document.querySelectorAll("pre.py-setup").forEach((node) => node.remove());

function loadPython() {
  if (!pyodidePromise) {
    pyodidePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PYODIDE_URL + "pyodide.js";
      script.onload = () => loadPyodide({ indexURL: PYODIDE_URL }).then(resolve, reject);
      script.onerror = () => reject(new Error("Could not load Python. Check your connection."));
      document.head.appendChild(script);
    });
  }
  return pyodidePromise;
}

// Keep only the useful part of a Python traceback (from the user's code to the error message).
function shortError(message) {
  const lines = message.trim().split("\n").filter((line) => line.trim() !== "PythonError");
  let start = -1;
  lines.forEach((line, index) => {
    if (line.includes('File "<exec>"')) start = index;
  });
  return (start >= 0 ? lines.slice(start) : lines.slice(-3)).join("\n").trim();
}

function tidyOutput(text) {
  const marker = "Traceback (most recent call last):";
  const at = text.indexOf(marker);
  if (at < 0) return text;
  return text.slice(0, at) + shortError(text.slice(at));
}

async function runPython(code, output) {
  output.textContent = "Loading Python (the first run takes a few seconds)...";
  try {
    const py = await loadPython();
    if (!setupDone) {
      await py.loadPackagesFromImports(setupCode);
      await py.runPythonAsync(setupCode);
      setupDone = true;
    }
    await py.loadPackagesFromImports(code);
    py.runPython("import sys, io\n_buf = io.StringIO()\nsys.stdout = _buf\nsys.stderr = _buf");
    let errorText = "";
    try {
      await py.runPythonAsync(code);
    } catch (error) {
      errorText = shortError(String(error.message || error));
    }
    const text = py.runPython("_buf.getvalue()");
    py.runPython("sys.stdout = sys.__stdout__\nsys.stderr = sys.__stderr__");
    output.textContent = tidyOutput((text + (errorText ? "\n" + errorText : "")).trim()) || "(no output)";
  } catch (error) {
    output.textContent = "Error: " + error.message;
  }
}

function makeRunner(pre) {
  const original = pre.textContent.replace(/^\n/, "").replace(/\s+$/, "");

  const box = document.createElement("div");
  box.className = "runner";

  const editor = document.createElement("textarea");
  editor.value = original;
  editor.spellcheck = false;
  editor.rows = Math.min(30, original.split("\n").length + 1);
  editor.setAttribute("aria-label", "Editable Python code");

  const bar = document.createElement("div");
  bar.className = "runner-bar";

  const run = document.createElement("button");
  run.type = "button";
  run.textContent = "Run";

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "secondary";
  reset.textContent = "Reset";

  const hint = document.createElement("span");
  hint.className = "runner-hint";
  hint.textContent = "Edit the code and press Run (or Ctrl/Cmd + Enter).";

  const output = document.createElement("pre");
  output.className = "runner-out";
  output.textContent = "Output appears here.";

  run.addEventListener("click", () => runPython(editor.value, output));
  reset.addEventListener("click", () => {
    editor.value = original;
    output.textContent = "Output appears here.";
  });
  editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = editor.selectionStart;
      editor.setRangeText("    ", start, editor.selectionEnd, "end");
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      runPython(editor.value, output);
    }
  });

  bar.append(run, reset, hint);
  box.append(editor, bar, output);
  pre.replaceWith(box);
}

/* ---------- Start ---------- */
document.querySelectorAll("pre.py-run").forEach(makeRunner);
renderMath();
renderDiagrams();
