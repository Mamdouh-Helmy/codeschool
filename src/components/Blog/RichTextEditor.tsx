// src/components/Blog/RichTextEditor.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Pilcrow,
  List,
  ListOrdered,
  Minus,
  Quote,
  Code,
  Link,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Eye,
  Palette,
  X,
  Table,
  Subscript,
  Superscript,
  Indent,
  Outdent,
  Save,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
} from "lucide-react";
import toast from "react-hot-toast";
import HtmlContentFrame from "./HtmlContentFrame";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** اتجاه المعاينة (rtl للعربي / ltr للإنجليزي) */
  dir?: "rtl" | "ltr";
}

interface LinkModalData {
  url: string;
  text: string;
  title?: string;
  target?: string;
}

interface ImageModalData {
  url: string;
  alt: string;
  title?: string;
  width?: string;
  height?: string;
  className?: string;
}

interface TableModalData {
  rows: number;
  cols: number;
  withHeader: boolean;
  className?: string;
  style?: string;
}

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  title: string;
  customAction?: () => void;
  disabled?: boolean;
}

interface ToolbarGroup {
  name: string;
  buttons: ToolbarButton[];
}

// ─── HTML / CSS / JS ─────────────────────────────────────────────────────────
// القيمة المخزّنة في الـ DB تفضل string واحد (HTML كامل فيه <style> و <script>)،
// لكن جوه الـ editor بنقسمها لـ 3 أجزاء عشان تتحرر كل واحدة في تابها.

type CodeParts = { html: string; css: string; js: string };
type EditorTab = "html" | "css" | "js" | "preview";

const STYLE_RE = /<style>([\s\S]*?)<\/style>/gi;
const SCRIPT_RE = /<script>([\s\S]*?)<\/script>/gi;

/** بيطلّع بلوكات <style> و <script> (من غير attributes) ويسيب الباقي HTML */
function parseCode(source: string): CodeParts {
  const css: string[] = [];
  const js: string[] = [];
  const html = (source || "")
    .replace(STYLE_RE, (_m, c: string) => {
      if (c.trim()) css.push(c.trim());
      return "";
    })
    .replace(SCRIPT_RE, (_m, c: string) => {
      if (c.trim()) js.push(c.trim());
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { html, css: css.join("\n\n"), js: js.join("\n\n") };
}

/** بيجمّع الـ 3 أجزاء في HTML واحد */
function composeCode({ html, css, js }: CodeParts): string {
  const extra = [
    css.trim() ? `<style>\n${css.trim()}\n</style>` : "",
    js.trim() ? `<script>\n${js.trim()}\n</script>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!extra) return html;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, () => `${extra}\n</body>`);
  }
  return html ? `${html}\n\n${extra}` : extra;
}

const TABS: { id: EditorTab; label: string; color: string }[] = [
  { id: "html", label: "HTML", color: "#ff6700" },
  { id: "css", label: "CSS", color: "#22d3ee" },
  { id: "js", label: "JavaScript", color: "#feaf00" },
  { id: "preview", label: "Preview", color: "#3fb950" },
];

const inputCls =
  "w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls =
  "block text-sm font-medium text-MidnightNavyText dark:text-white mb-2";
const codeAreaCls =
  "block w-full px-4 py-3 border-0 outline-none focus:ring-0 resize-none font-mono text-sm leading-6 bg-[#0d1117] text-[#e6edf3] placeholder:text-[#6e7681] min-h-[300px]";

// ─── Theme helper: snippets بتتحط في تاب CSS / JS بضغطة زرار ─────────────────
// الـ iframe بيحط على <html> الاتنين: data-theme="dark|light" وكلاس "dark" (لو دارك)
const CSS_SNIPPETS: { label: string; title: string; code: string }[] = [
  {
    label: "قالب Light + Dark",
    title: "كلاس كامل بنسخة لايت (الافتراضي) ونسخة دارك",
    code: `/* ===== Light (الافتراضي) ===== */
.my-box {
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

/* ===== Dark Mode ===== */
html[data-theme="dark"] .my-box {
  background: #161b22;
  border-color: #30363d;
}
`,
  },
  {
    label: "Dark selector",
    title: "أي ستايل جواه بيتطبق في الدارك مود بس",
    code: `html[data-theme="dark"] .my-class {
  
}
`,
  },
  {
    label: "Light selector",
    title: "أي ستايل جواه بيتطبق في اللايت مود بس",
    code: `html[data-theme="light"] .my-class {
  
}
`,
  },
  {
    label: "متغير بلونين",
    title: "متغير بيتغير لونه تلقائياً مع الثيم",
    code: `:root {
  --accent: #ff6700;
}
html[data-theme="dark"] {
  --accent: #ffb27a;
}
`,
  },
];

// متغيرات جاهزة بتتغير تلقائياً مع الدارك/لايت (معرّفة في BASE_CSS بتاع HtmlContentFrame)
const CSS_VARS = [
  "--bg",
  "--text",
  "--muted",
  "--card",
  "--card-soft",
  "--border",
  "--primary",
  "--primary-soft",
  "--secondary",
  "--code-bg",
  "--success",
  "--danger",
];

const JS_SNIPPETS: { label: string; title: string; code: string }[] = [
  {
    label: "Detect theme",
    title: "اعرف الثيم الحالي واسمع لتغييره (مفيد للـ charts)",
    code: `const isDark = () =>
  document.documentElement.getAttribute("data-theme") === "dark";

console.log("dark?", isDark());

window.addEventListener("themechange", (e) => {
  console.log("dark?", e.detail.dark);
  // حدّث الـ chart أو أي حاجة بتعتمد على اللون هنا
});
`,
  },
];

// ─── Modal Shell (مشترك بين كل المودالز) ─────────────────────────────────────
function ModalShell({
  title,
  onClose,
  onConfirm,
  confirmLabel,
  cancelLabel,
  confirmDisabled,
  maxWidth = "max-w-md",
  children,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel: string;
  confirmDisabled?: boolean;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        // منع الـ Enter من عمل submit للـ BlogForm اللي الـ editor جواه
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
          if (!confirmDisabled) onConfirm();
        }
      }}
    >
      <div
        className={`bg-white dark:bg-darkmode rounded-lg w-full ${maxWidth} border border-PowderBlueBorder dark:border-dark_border`}
      >
        <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border">
          <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-SlateBlueText hover:text-MidnightNavyText dark:text-darktext dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
        <div className="flex justify-end gap-3 p-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  dir,
}: RichTextEditorProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cssRef = useRef<HTMLTextAreaElement>(null);
  const jsRef = useRef<HTMLTextAreaElement>(null);

  // الأجزاء الـ 3 (مصدر الحقيقة جوه الـ editor)
  const [code, setCode] = useState<CodeParts>(() => parseCode(value));
  const lastEmitted = useRef(value);

  const [activeTab, setActiveTab] = useState<EditorTab>("html");
  const [splitView, setSplitView] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [customColor, setCustomColor] = useState("#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ثيم المعاينة (مستقل عن ثيم الموقع) — بيبدأ بثيم الموقع الحالي
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setPreviewTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);
  const previewDark = previewTheme === "dark";

  // Modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [linkData, setLinkData] = useState<LinkModalData>({
    url: "",
    text: "",
    title: "",
    target: "_blank",
  });
  const [imageData, setImageData] = useState<ImageModalData>({
    url: "",
    alt: "",
    title: "",
    width: "",
    height: "",
    className: "",
  });
  const [tableData, setTableData] = useState<TableModalData>({
    rows: 3,
    cols: 3,
    withHeader: true,
    className: "",
    style: "",
  });
  const [codeData, setCodeData] = useState({ code: "" });
  const [imageUploadMode, setImageUploadMode] = useState<"upload" | "url">("upload");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // لما الـ value يتغير من بره (تغيير اللغة / تحميل مقال) نعيد التقسيم
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setCode(parseCode(value));
    }
  }, [value]);

  // الـ history
  useEffect(() => {
    if (value === history[historyIndex]) return;
    const next = [...history.slice(0, historyIndex + 1), value].slice(-200);
    setHistory(next);
    setHistoryIndex(next.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // أي تعديل (من أي تاب) بيعدّي من هنا
  const emit = (next: CodeParts) => {
    setCode(next);
    const composed = composeCode(next);
    lastEmitted.current = composed;
    onChange(composed);
  };

  const html = code.html;
  const setHtml = (next: string) => emit({ ...code, html: next });

  // Undo / Redo
  const applyHistory = (index: number) => {
    const h = history[index];
    setHistoryIndex(index);
    lastEmitted.current = h;
    setCode(parseCode(h));
    onChange(h);
  };
  const handleUndo = () => historyIndex > 0 && applyHistory(historyIndex - 1);
  const handleRedo = () =>
    historyIndex < history.length - 1 && applyHistory(historyIndex + 1);

  const handleTextSelect = () => {
    const ta = textareaRef.current;
    if (ta) setSelection({ start: ta.selectionStart, end: ta.selectionEnd });
  };

  // Tab = مسافتين جوه الـ textarea (زي أي code editor)
  const handleTabKey = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: keyof CodeParts
  ) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const s = ta.selectionStart;
    const en = ta.selectionEnd;
    emit({ ...code, [field]: code[field].slice(0, s) + "  " + code[field].slice(en) });
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = s + 2;
    });
  };

  // إدراج snippet (CSS / JS) في مكان المؤشر
  const insertSnippet = (field: "css" | "js", snippet: string) => {
    const ta = field === "css" ? cssRef.current : jsRef.current;
    const cur = code[field];
    const start = ta ? ta.selectionStart : cur.length;
    const end = ta ? ta.selectionEnd : cur.length;
    const multiline = snippet.includes("\n");
    const prefix = multiline && start > 0 && cur[start - 1] !== "\n" ? "\n\n" : "";
    const text = prefix + snippet;
    emit({ ...code, [field]: cur.slice(0, start) + text + cur.slice(end) });
    setTimeout(() => {
      if (!ta) return;
      const pos = start + text.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  // ─── عمليات التعديل على الـ HTML ───────────────────────────────────────────
  const wrapSelection = (before: string, after: string = "", newLine: boolean = false) => {
    const selected = html.substring(selection.start, selection.end);
    const prefix = newLine ? "\n" : "";
    const suffix = newLine ? "\n" : "";

    setHtml(
      html.substring(0, selection.start) +
        prefix + before + selected + after + suffix +
        html.substring(selection.end)
    );

    setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const s = selection.start + prefix.length + before.length;
      ta.focus();
      ta.setSelectionRange(s, s + selected.length);
    }, 0);
  };

  const insertAtCursor = (text: string, selectAfterInsert: boolean = false) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setHtml(html.substring(0, start) + text + html.substring(end));

    setTimeout(() => {
      ta.focus();
      if (selectAfterInsert) ta.setSelectionRange(start, start + text.length);
      else ta.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const replaceSelection = (replacement: string) => {
    setHtml(
      html.substring(0, selection.start) + replacement + html.substring(selection.end)
    );
    setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(selection.start, selection.start + replacement.length);
    }, 0);
  };

  const handleBlockquote = () => {
    const selected = html.substring(selection.start, selection.end);
    if (selected) {
      const lines = selected.split("\n").filter((l) => l.trim());
      const items = lines
        .map((l) => `<div class="blockquote-item"><blockquote>${l.trim()}</blockquote></div>`)
        .join("\n");
      replaceSelection(`\n<div class="blockquote-container">\n${items}\n</div>\n`);
    } else {
      insertAtCursor(
        '\n<div class="blockquote-container">\n<div class="blockquote-item"><blockquote>Your quote here</blockquote></div>\n</div>\n',
        true
      );
    }
  };

  const makeList = (tag: "ul" | "ol", sample: string[]) => {
    const selected = html.substring(selection.start, selection.end);
    if (selected) {
      const lines = selected.split("\n").filter((l) => l.trim());
      replaceSelection(
        `<${tag}>\n${lines.map((l) => `  <li>${l.trim()}</li>`).join("\n")}\n</${tag}>`
      );
    } else {
      insertAtCursor(
        `<${tag}>\n${sample.map((s) => `  <li>${s}</li>`).join("\n")}\n</${tag}>`
      );
    }
  };
  const handleBulletList = () => makeList("ul", ["Item 1", "Item 2", "Item 3"]);
  const handleNumberedList = () => makeList("ol", ["First item", "Second item", "Third item"]);

  const increaseIndent = () => {
    const selected = html.substring(selection.start, selection.end);
    if (selected) {
      replaceSelection(
        selected.split("\n").map((l) => `    ${l}`).join("\n")
      );
    } else {
      insertAtCursor("    ");
    }
  };

  const decreaseIndent = () => {
    const selected = html.substring(selection.start, selection.end);
    if (selected) {
      replaceSelection(
        selected.split("\n").map((l) => l.replace(/^ {1,4}/, "")).join("\n")
      );
      return;
    }
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const beforeText = html.substring(0, start);
    const currentLine = beforeText.split("\n").pop() || "";
    const m = currentLine.match(/^( {1,4})/);
    if (m) {
      const len = m[1].length;
      const newStart = start - len;
      setHtml(beforeText.substring(0, beforeText.length - len) + html.substring(start));
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(newStart, newStart);
      }, 0);
    }
  };

  // ─── Link ─────────────────────────────────────────────────────────────────
  const addLink = () => {
    setLinkData({
      url: "",
      text: html.substring(selection.start, selection.end) || "",
      title: "",
      target: "_blank",
    });
    setShowLinkModal(true);
  };

  const handleInsertLink = () => {
    if (!linkData.url.trim()) {
      toast.error(t("blogForm.urlRequired") || "URL is required");
      return;
    }
    const open = `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer">`;
    if (selection.start !== selection.end) {
      wrapSelection(open, "</a>");
    } else {
      insertAtCursor(`${open}${linkData.text || linkData.url}</a>`);
    }
    setShowLinkModal(false);
    setLinkData({ url: "", text: "", title: "", target: "_blank" });
    toast.success(t("blogForm.linkAdded") || "Link added successfully");
  };

  // ─── Image ────────────────────────────────────────────────────────────────
  const addImage = () => {
    setImageData({ url: "", alt: "", title: "", width: "", height: "", className: "" });
    setImageUploadMode("upload");
    setShowImageModal(true);
  };

  const handleInsertImage = () => {
    if (!imageData.url.trim()) {
      toast.error(t("blogForm.imageUrlRequired") || "Image URL is required");
      return;
    }
    const toCss = (v: string) => (/^\d+$/.test(v) ? `${v}px` : v);
    const styleParts = [
      imageData.width?.trim() ? `width: ${toCss(imageData.width.trim())}` : "max-width: 100%",
      imageData.height?.trim() ? `height: ${toCss(imageData.height.trim())}` : "height: auto",
    ];
    insertAtCursor(
      `<img src="${imageData.url}" alt="${imageData.alt || ""}" style="${styleParts.join("; ")};" />`
    );
    setShowImageModal(false);
    setImageData({ url: "", alt: "", title: "", width: "", height: "", className: "" });
    toast.success(t("blogForm.imageAdded") || "Image added successfully");
  };

  const handleImageFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image size must be less than 20MB");
      return;
    }
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "blog-content-images");
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setImageData((prev) => ({ ...prev, url: json.imageUrl }));
        toast.success("Image uploaded successfully");
      } else {
        toast.error(json.message || "Failed to upload image");
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ─── Table ────────────────────────────────────────────────────────────────
  const addTable = () => {
    setTableData({ rows: 3, cols: 3, withHeader: true, className: "", style: "" });
    setShowTableModal(true);
  };

  const handleInsertTable = () => {
    const { rows, cols, withHeader, className, style } = tableData;
    let out = "\n<table";
    if (className) out += ` class="${className}"`;
    if (style) out += ` style="${style}"`;
    out += ">\n";

    if (withHeader) {
      out += "<thead><tr>";
      for (let i = 0; i < cols; i++) out += `<th>Header ${i + 1}</th>`;
      out += "</tr></thead>\n";
    }

    out += "<tbody>\n";
    const dataRows = withHeader ? rows - 1 : rows;
    for (let i = 0; i < dataRows; i++) {
      out += "<tr>";
      for (let j = 0; j < cols; j++) out += `<td>Cell ${i + 1}-${j + 1}</td>`;
      out += "</tr>\n";
    }
    out += "</tbody>\n</table>\n";

    insertAtCursor(out);
    setShowTableModal(false);
    toast.success(t("blogForm.tableAdded") || "Table added successfully");
  };

  // ─── Code snippet ─────────────────────────────────────────────────────────
  const addCustomCode = () => {
    setCodeData({ code: "" });
    setShowCodeModal(true);
  };

  const handleInsertCode = () => {
    if (!codeData.code.trim()) {
      toast.error("Code content is required");
      return;
    }
    insertAtCursor(`\n<code>\n${codeData.code}\n</code>\n`);
    setShowCodeModal(false);
    setCodeData({ code: "" });
    toast.success("Code block added successfully");
  };

  const changeTextColor = () => {
    wrapSelection(`<span style="color: ${customColor}">`, "</span>");
    setShowColorPicker(false);
    toast.success(t("blogForm.colorApplied") || "Color applied successfully");
  };

  // التنسيقات الأساسية
  const formatAction = (type: string) => {
    switch (type) {
      case "bold":
        wrapSelection('<div class=""><strong>', "</strong></div><br>", true);
        break;
      case "italic":
        wrapSelection('<div class=""><em>', "</em></div><br>", true);
        break;
      case "underline":
        wrapSelection('<div class=""><u>', "</u></div><br>", true);
        break;
      case "strikethrough":
        wrapSelection('<div class=""><del>', "</del></div><br>", true);
        break;
      case "highlight":
        wrapSelection('<div class=""><mark style="background-color: yellow">', "</mark></div><br>", true);
        break;
      case "heading1":
        wrapSelection("<h1>", "</h1>", true);
        break;
      case "heading2":
        wrapSelection("<h2>", "</h2>", true);
        break;
      case "heading3":
        wrapSelection("<h3>", "</h3>", true);
        break;
      case "heading4":
        wrapSelection("<h4>", "</h4>", true);
        break;
      case "heading5":
        wrapSelection("<h5>", "</h5>", true);
        break;
      case "heading6":
        wrapSelection("<h6>", "</h6>", true);
        break;
      case "paragraph":
        wrapSelection('<div class=""><p>', "</p></div><br>", true);
        break;
      case "horizontalLine":
        insertAtCursor("\n<hr />\n");
        break;
      case "code":
      case "inlineCode":
        wrapSelection('<div class=""><code>', "</code></div><br>", true);
        break;
      case "subscript":
        wrapSelection("<sub>", "</sub>");
        break;
      case "superscript":
        wrapSelection("<sup>", "</sup>");
        break;
      case "alignLeft":
        wrapSelection('<div style="text-align: left">', "</div>", true);
        break;
      case "alignCenter":
        wrapSelection('<div style="text-align: center">', "</div>", true);
        break;
      case "alignRight":
        wrapSelection('<div style="text-align: right">', "</div>", true);
        break;
      default:
        break;
    }
  };

  // تصدير المحتوى كملف HTML كامل (HTML + CSS + JS)
  const exportContent = () => {
    const blob = new Blob([value], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Content exported successfully");
  };

  const toolbarGroups: ToolbarGroup[] = [
    {
      name: "history",
      buttons: [
        {
          icon: Undo,
          action: "undo",
          title: t("blogForm.undo") || "Undo",
          customAction: handleUndo,
          disabled: historyIndex === 0,
        },
        {
          icon: Redo,
          action: "redo",
          title: t("blogForm.redo") || "Redo",
          customAction: handleRedo,
          disabled: historyIndex === history.length - 1,
        },
        { icon: Save, action: "export", title: "Export", customAction: exportContent },
      ],
    },
    {
      name: "textFormat",
      buttons: [
        { icon: Bold, action: "bold", title: t("blogForm.bold") || "Bold" },
        { icon: Italic, action: "italic", title: t("blogForm.italic") || "Italic" },
        { icon: Underline, action: "underline", title: t("blogForm.underline") || "Underline" },
        { icon: Strikethrough, action: "strikethrough", title: t("blogForm.strikethrough") || "Strikethrough" },
        { icon: Highlighter, action: "highlight", title: t("blogForm.highlight") || "Highlight" },
        { icon: Subscript, action: "subscript", title: t("blogForm.subscript") || "Subscript" },
        { icon: Superscript, action: "superscript", title: t("blogForm.superscript") || "Superscript" },
      ],
    },
    {
      name: "headings",
      buttons: [
        { icon: Heading1, action: "heading1", title: t("blogForm.heading1") || "Heading 1" },
        { icon: Heading2, action: "heading2", title: t("blogForm.heading2") || "Heading 2" },
        { icon: Heading3, action: "heading3", title: t("blogForm.heading3") || "Heading 3" },
        { icon: Heading4, action: "heading4", title: t("blogForm.heading4") || "Heading 4" },
        { icon: Heading5, action: "heading5", title: t("blogForm.heading5") || "Heading 5" },
        { icon: Heading6, action: "heading6", title: t("blogForm.heading6") || "Heading 6" },
        { icon: Pilcrow, action: "paragraph", title: t("blogForm.paragraph") || "Paragraph" },
      ],
    },
    {
      name: "lists",
      buttons: [
        { icon: List, action: "bulletList", title: t("blogForm.bulletList") || "Bullet List", customAction: handleBulletList },
        { icon: ListOrdered, action: "numberedList", title: t("blogForm.numberedList") || "Numbered List", customAction: handleNumberedList },
        { icon: Indent, action: "increaseIndent", title: t("blogForm.increaseIndent") || "Increase Indent", customAction: increaseIndent },
        { icon: Outdent, action: "decreaseIndent", title: t("blogForm.decreaseIndent") || "Decrease Indent", customAction: decreaseIndent },
      ],
    },
    {
      name: "insert",
      buttons: [
        { icon: Link, action: "link", title: t("blogForm.link") || "Insert Link", customAction: addLink },
        { icon: ImageIcon, action: "image", title: t("blogForm.image") || "Insert Image", customAction: addImage },
        { icon: Table, action: "table", title: t("blogForm.table") || "Insert Table", customAction: addTable },
        { icon: Code, action: "customCode", title: "Insert Code", customAction: addCustomCode },
        { icon: Minus, action: "horizontalLine", title: t("blogForm.horizontalLine") || "Horizontal Line" },
        { icon: Quote, action: "blockquote", title: t("blogForm.blockquote") || "Blockquote", customAction: handleBlockquote },
      ],
    },
    {
      name: "alignment",
      buttons: [
        { icon: AlignLeft, action: "alignLeft", title: t("blogForm.alignLeft") || "Align Left" },
        { icon: AlignCenter, action: "alignCenter", title: t("blogForm.alignCenter") || "Align Center" },
        { icon: AlignRight, action: "alignRight", title: t("blogForm.alignRight") || "Align Right" },
      ],
    },
  ];

  // ─── Layout flags ─────────────────────────────────────────────────────────
  const showEditor = activeTab !== "preview";
  const showPreviewPane = activeTab === "preview" || splitView;
  const isSplit = showEditor && showPreviewPane;
  const fixedHeight = !isFullscreen && isSplit ? 460 : undefined;

  const tabHasContent = (id: EditorTab) =>
    id === "html" ? !!code.html.trim() : id === "css" ? !!code.css.trim() : id === "js" ? !!code.js.trim() : false;

  const renderCodeArea = () => {
    if (activeTab === "preview") return null;
    // الـ textarea بياخد باقي المساحة جوه الـ pane (اللي هو flex column)
    const style: React.CSSProperties = {
      flex: isFullscreen || isSplit ? "1 1 0%" : undefined,
    };

    if (activeTab === "html") {
      return (
        <textarea
          ref={textareaRef}
          value={code.html}
          onChange={(e) => setHtml(e.target.value)}
          onSelect={handleTextSelect}
          onKeyDown={(e) => handleTabKey(e, "html")}
          placeholder={placeholder}
          rows={15}
          dir="auto"
          spellCheck={false}
          className={codeAreaCls}
          style={style}
        />
      );
    }

    const field = activeTab; // "css" | "js"
    return (
      <textarea
        key={field}
        ref={field === "css" ? cssRef : jsRef}
        value={code[field]}
        onChange={(e) => emit({ ...code, [field]: e.target.value })}
        onKeyDown={(e) => handleTabKey(e, field)}
        placeholder={
          field === "css"
            ? "/* CSS هنا — بيتطبق على الـ HTML تلقائياً */\n.card {\n  background: var(--card);\n  border: 1px solid var(--border);\n}"
            : "// JavaScript هنا — بيشتغل مع الـ HTML والـ CSS\ndocument.querySelector('.card')?.addEventListener('click', () => {\n  alert('Hello!');\n});"
        }
        rows={15}
        dir="ltr"
        spellCheck={false}
        className={codeAreaCls}
        style={style}
      />
    );
  };

  const chipCls =
    "px-2 py-1 rounded border border-dark_border bg-[#0d1117] text-[#c9d1d9] hover:border-primary hover:text-white transition-colors whitespace-nowrap";

  // شريط المساعدة: بيظهر فوق تاب CSS و JS
  const themeHelper =
    activeTab === "css" ? (
      <div className="bg-[#161b22] border-b border-dark_border px-3 py-2 text-xs space-y-2">
        <p className="text-[#8b949e] leading-5">
          الستايل الافتراضي هو <strong className="text-white">Light</strong>. علشان تعمل نسخة دارك
          اكتب <code className="font-mono text-[#ffb27a]">html[data-theme=&quot;dark&quot;]</code> قبل
          الـ selector. استخدم زرار الثيم فوق وشوف النتيجة في المعاينة.
        </p>
        <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
          {CSS_SNIPPETS.map((s) => (
            <button
              key={s.label}
              type="button"
              title={s.title}
              onClick={() => insertSnippet("css", s.code)}
              className={chipCls}
            >
              + {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
          <span className="text-[#6e7681]">Variables:</span>
          {CSS_VARS.map((v) => (
            <button
              key={v}
              type="button"
              title={`يتغير تلقائياً مع الثيم — var(${v})`}
              onClick={() => insertSnippet("css", `var(${v})`)}
              className={`${chipCls} font-mono`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    ) : activeTab === "js" ? (
      <div className="bg-[#161b22] border-b border-dark_border px-3 py-2 text-xs flex flex-wrap items-center gap-1.5" dir="ltr">
        {JS_SNIPPETS.map((s) => (
          <button
            key={s.label}
            type="button"
            title={s.title}
            onClick={() => insertSnippet("js", s.code)}
            className={chipCls}
          >
            + {s.label}
          </button>
        ))}
      </div>
    ) : null;

  const previewPane = (
    <div
      className={`p-6 overflow-auto transition-colors ${
        isFullscreen ? "h-full" : "min-h-[300px]"
      }`}
      style={{
        height: fixedHeight,
        // الخلفية بتتبع ثيم المعاينة (مش ثيم الموقع)
        background: previewDark ? "#0a0f17" : "#ffffff",
        colorScheme: previewDark ? "dark" : "light",
      }}
    >
      {value.trim() ? (
        <HtmlContentFrame
          html={value}
          dir={dir}
          debounceMs={300}
          forceTheme={previewTheme}
        />
      ) : (
        <p className="text-sm" style={{ color: previewDark ? "#8b949e" : "#6b7280" }}>
          ابدأ بكتابة HTML أو CSS أو JavaScript وهتظهر المعاينة هنا.
        </p>
      )}
    </div>
  );

  const footerHint =
    activeTab === "css" ? (
      <span>
        متغيرات الدارك/لايت: {"var(--bg) var(--text) var(--card) var(--border) var(--primary)"} •
        للدارك: {'html[data-theme="dark"] .x { }'}
      </span>
    ) : activeTab === "js" ? (
      <span>
        الـ JS بيشتغل جوه iframe معزول • لتغيير الثيم:{" "}
        {'window.addEventListener("themechange", e => e.detail.dark)'}
      </span>
    ) : (
      <div>
        <strong>{t("blogForm.quickReference") || "Quick reference"}:</strong>{" "}
        <strong>&lt;strong&gt;Bold&lt;/strong&gt;</strong> • <em>&lt;em&gt;Italic&lt;/em&gt;</em> •{" "}
        &lt;h1&gt;Heading&lt;/h1&gt;
      </div>
    );

  return (
    <>
      <div
        className={`border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden bg-white dark:bg-darkmode transition-all duration-300 ${
          isFullscreen ? "fixed inset-4 z-50 flex flex-col shadow-2xl" : "relative"
        }`}
      >
        {/* ── Tabs ── */}
        <div className="flex items-center justify-between gap-2 px-2 pt-2 bg-[#0d1117] border-b border-dark_border overflow-x-auto">
          <div role="tablist" className="flex gap-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-md border-t-2 whitespace-nowrap transition-colors ${
                    active
                      ? "bg-[#161b22] text-white"
                      : "border-transparent text-[#8b949e] hover:text-white hover:bg-[#161b22]/60"
                  }`}
                  style={active ? { borderTopColor: tab.color } : undefined}
                >
                  {tab.id === "preview" ? (
                    <Eye className="w-3.5 h-3.5" style={{ color: tab.color }} />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: tab.color, opacity: tabHasContent(tab.id) ? 1 : 0.35 }}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 pb-1">
            {/* زرار ثيم المعاينة فقط (مش بيغيّر ثيم الموقع ومش بيعمل submit للفورم) */}
            <button
              type="button"
              onClick={() => setPreviewTheme((v) => (v === "dark" ? "light" : "dark"))}
              title="تبديل المعاينة بين Light و Dark"
              aria-pressed={previewDark}
              className="flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium whitespace-nowrap text-[#c9d1d9] hover:text-white hover:bg-[#161b22] border border-dark_border transition-colors"
            >
              {previewDark ? (
                <Moon className="w-3.5 h-3.5 text-[#feaf00]" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-[#feaf00]" />
              )}
              {previewDark ? "Dark" : "Light"}
            </button>
            <button
              type="button"
              onClick={() => setSplitView((v) => !v)}
              title="Live preview بجانب الكود"
              aria-pressed={splitView}
              className={`flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                splitView
                  ? "bg-primary text-white"
                  : "text-[#8b949e] hover:text-white hover:bg-[#161b22]"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              Split
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="w-8 h-8 flex items-center justify-center rounded text-[#8b949e] hover:text-white hover:bg-[#161b22] transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── Toolbar (HTML tab فقط) ── */}
        {activeTab === "html" && (
          <div className="p-3 border-b border-PowderBlueBorder dark:border-dark_border bg-IcyBreeze dark:bg-dark_input">
            <div className="flex flex-wrap gap-1">
              {toolbarGroups.map((group, groupIndex) => (
                <div key={group.name} className="flex items-center gap-1">
                  {group.buttons.map(({ icon: Icon, action, title, customAction, disabled }) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => (customAction ? customAction() : formatAction(action))}
                      title={title}
                      disabled={disabled || false}
                      className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                        disabled
                          ? "opacity-50 cursor-not-allowed text-gray-400"
                          : "hover:bg-white dark:hover:bg-darkmode text-MidnightNavyText dark:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                  {groupIndex < toolbarGroups.length - 1 && (
                    <div className="w-px h-4 bg-PowderBlueBorder dark:bg-dark_border mx-1"></div>
                  )}
                </div>
              ))}

              {/* Color Picker */}
              <div className="flex items-center gap-1">
                <div className="w-px h-4 bg-PowderBlueBorder dark:bg-dark_border mx-1"></div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    title={t("blogForm.textColor") || "Text Color"}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-darkmode transition-colors text-MidnightNavyText dark:text-white"
                  >
                    <Palette className="w-4 h-4" />
                  </button>

                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg z-50 min-w-48">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="w-8 h-8 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="flex-1 px-2 py-1 border border-PowderBlueBorder dark:border-dark_border rounded text-sm bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                          placeholder="#000000"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={changeTextColor}
                          className="flex-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
                        >
                          {t("blogForm.applyColor") || "Apply Color"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowColorPicker(false)}
                          className="px-3 py-1.5 border border-PowderBlueBorder dark:border-dark_border text-xs rounded text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-darkmode transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Editor / Preview ── */}
        <div className={isFullscreen ? "flex-1 min-h-0" : ""}>
          <div
            className={`${
              isSplit
                ? "grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-PowderBlueBorder dark:divide-dark_border"
                : ""
            } ${isFullscreen ? "h-full" : ""} ${
              isFullscreen && isSplit ? "grid-rows-2 lg:grid-rows-1" : ""
            }`}
          >
            {showEditor && (
              <div
                className={`min-w-0 flex flex-col ${isFullscreen ? "h-full min-h-0" : ""}`}
                style={{ height: fixedHeight }}
              >
                {themeHelper}
                {renderCodeArea()}
              </div>
            )}
            {showPreviewPane && <div className="min-w-0 min-h-0">{previewPane}</div>}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-2 bg-IcyBreeze dark:bg-dark_input border-t border-PowderBlueBorder dark:border-dark_border text-xs text-SlateBlueText dark:text-darktext flex justify-between items-center gap-4">
          <div className="min-w-0 truncate">{footerHint}</div>
          <div className="text-xs flex items-center gap-4 shrink-0">
            <span>
              {value.length} {t("blogForm.characters") || "characters"}
            </span>
            <span>
              {code.html.replace(/<[^>]*>/g, " ").split(/\s+/).filter((w) => w.length > 0).length}{" "}
              {t("blogForm.words") || "words"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showLinkModal && (
        <ModalShell
          title={t("blogForm.insertLink") || "Insert Link"}
          onClose={() => setShowLinkModal(false)}
          onConfirm={handleInsertLink}
          confirmLabel={t("blogForm.insertLink") || "Insert Link"}
          cancelLabel={t("blogForm.cancel") || "Cancel"}
        >
          <div>
            <label className={labelCls}>{t("blogForm.linkText") || "Link Text"}</label>
            <input
              type="text"
              value={linkData.text}
              onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
              className={inputCls}
              placeholder={t("blogForm.enterLinkText") || "Enter link text"}
            />
          </div>
          <div>
            <label className={labelCls}>{t("blogForm.url") || "URL"} *</label>
            <input
              type="url"
              value={linkData.url}
              onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
              className={inputCls}
              placeholder="https://example.com"
            />
          </div>
        </ModalShell>
      )}

      {showImageModal && (
        <ModalShell
          title={t("blogForm.insertImage") || "Insert Image"}
          onClose={() => setShowImageModal(false)}
          onConfirm={handleInsertImage}
          confirmLabel={t("blogForm.insertImage") || "Insert Image"}
          cancelLabel={t("blogForm.cancel") || "Cancel"}
          confirmDisabled={!imageData.url || isUploadingImage}
        >
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-dark_input rounded-lg">
            {(["upload", "url"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setImageUploadMode(mode)}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                  imageUploadMode === mode
                    ? "bg-white dark:bg-darkmode text-primary shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {mode === "upload" ? "Upload from device" : "Image URL"}
              </button>
            ))}
          </div>

          {imageUploadMode === "upload" ? (
            <div>
              <input
                type="file"
                accept="image/*"
                ref={imageFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFileUpload(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
              {imageData.url ? (
                <div className="relative">
                  <img
                    src={imageData.url}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 dark:border-dark_border"
                  />
                  <button
                    type="button"
                    onClick={() => setImageData({ ...imageData, url: "" })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-dark_border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all text-gray-500 dark:text-gray-400"
                >
                  {isUploadingImage ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-sm">Click to upload an image</span>
                      <span className="text-xs text-gray-400">Max 20MB</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div>
              <label className={labelCls}>{t("blogForm.imageUrl") || "Image URL"} *</label>
              <input
                type="url"
                value={imageData.url}
                onChange={(e) => setImageData({ ...imageData, url: e.target.value })}
                className={inputCls}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Width</label>
              <input
                type="text"
                value={imageData.width}
                onChange={(e) => setImageData({ ...imageData, width: e.target.value })}
                className={inputCls}
                placeholder="e.g. 400 or 50%"
              />
            </div>
            <div>
              <label className={labelCls}>Height</label>
              <input
                type="text"
                value={imageData.height}
                onChange={(e) => setImageData({ ...imageData, height: e.target.value })}
                className={inputCls}
                placeholder="e.g. 300 or auto"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            Leave empty for automatic sizing. Numbers are treated as pixels (e.g. 400 → 400px).
          </p>

          <div>
            <label className={labelCls}>{t("blogForm.altText") || "Alt Text"}</label>
            <input
              type="text"
              value={imageData.alt}
              onChange={(e) => setImageData({ ...imageData, alt: e.target.value })}
              className={inputCls}
              placeholder={t("blogForm.enterImageAlt") || "Enter image alt text"}
            />
          </div>
        </ModalShell>
      )}

      {showTableModal && (
        <ModalShell
          title={t("blogForm.insertTable") || "Insert Table"}
          onClose={() => setShowTableModal(false)}
          onConfirm={handleInsertTable}
          confirmLabel={t("blogForm.insertTable") || "Insert Table"}
          cancelLabel={t("blogForm.cancel") || "Cancel"}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("blogForm.rows") || "Rows"}</label>
              <input
                type="number"
                min="1"
                max="20"
                value={tableData.rows}
                onChange={(e) => setTableData({ ...tableData, rows: parseInt(e.target.value) || 1 })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t("blogForm.columns") || "Columns"}</label>
              <input
                type="number"
                min="1"
                max="10"
                value={tableData.cols}
                onChange={(e) => setTableData({ ...tableData, cols: parseInt(e.target.value) || 1 })}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="withHeader"
              checked={tableData.withHeader}
              onChange={(e) => setTableData({ ...tableData, withHeader: e.target.checked })}
              className="rounded border-PowderBlueBorder dark:border-dark_border text-primary focus:ring-primary"
            />
            <label htmlFor="withHeader" className="text-sm text-MidnightNavyText dark:text-white">
              {t("blogForm.includeHeader") || "Include header row"}
            </label>
          </div>
        </ModalShell>
      )}

      {showCodeModal && (
        <ModalShell
          title="Insert Code Block"
          onClose={() => setShowCodeModal(false)}
          onConfirm={handleInsertCode}
          confirmLabel="Insert Code"
          cancelLabel="Cancel"
          maxWidth="max-w-2xl"
        >
          <div>
            <label className={labelCls}>HTML Code *</label>
            <textarea
              value={codeData.code}
              onChange={(e) => setCodeData({ ...codeData, code: e.target.value })}
              rows={8}
              dir="ltr"
              className={`${inputCls} font-mono text-sm`}
              placeholder="<!-- Enter your HTML code here -->"
            />
          </div>
        </ModalShell>
      )}
    </>
  );
}