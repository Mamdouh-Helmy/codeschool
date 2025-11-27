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
  Type,
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
} from "lucide-react";
import toast from "react-hot-toast";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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

interface CssModalData {
  css: string;
  className?: string;
}

// تعريف نوع الزر في الـ toolbar
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

export default function RichTextEditor({
  value,
  onChange,
  placeholder
}: RichTextEditorProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [customColor, setCustomColor] = useState("#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // States for modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showCssModal, setShowCssModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [linkData, setLinkData] = useState<LinkModalData>({
    url: "",
    text: "",
    title: "",
    target: "_blank"
  });
  const [imageData, setImageData] = useState<ImageModalData>({
    url: "",
    alt: "",
    title: "",
    width: "",
    height: "",
    className: ""
  });
  const [tableData, setTableData] = useState<TableModalData>({
    rows: 3,
    cols: 3,
    withHeader: true,
    className: "",
    style: ""
  });
  const [cssData, setCssData] = useState<CssModalData>({
    css: "",
    className: ""
  });
  const [codeData, setCodeData] = useState({
    code: ""
  });

  // Update history when value changes from parent
  useEffect(() => {
    if (value !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(value);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [value]);

  // حفظ في الـ history
  const saveToHistory = (newValue: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // إدارة التحديد
  const handleTextSelect = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      setSelection({
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      });
    }
  };

  // دالة محسنة للتفاف النص
  const wrapSelection = (before: string, after: string = "", newLine: boolean = false) => {
    const text = value;
    const beforeText = text.substring(0, selection.start);
    const selectedText = text.substring(selection.start, selection.end);
    const afterText = text.substring(selection.end);

    const prefix = newLine ? '\n' : '';
    const suffix = newLine ? '\n' : '';

    const newText = beforeText + prefix + before + selectedText + after + suffix + afterText;
    onChange(newText);
    saveToHistory(newText);

    // تحديث التحديد بدقة
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newStart = selection.start + prefix.length + before.length;
        const newEnd = newStart + selectedText.length;
        textarea.focus();
        textarea.setSelectionRange(newStart, newEnd);
      }
    }, 0);
  };

  // دالة محسنة للإدراج
  const insertAtCursor = (text: string, selectAfterInsert: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);

    onChange(newValue);
    saveToHistory(newValue);

    setTimeout(() => {
      textarea.focus();
      if (selectAfterInsert) {
        textarea.setSelectionRange(start, start + text.length);
      } else {
        textarea.setSelectionRange(start + text.length, start + text.length);
      }
    }, 0);
  };

  // دالة محسنة للاقتباس (Blockquote) - تم التعديل هنا
  const handleBlockquote = () => {
    const selectedText = value.substring(selection.start, selection.end);

    if (selectedText) {
      // إذا كان هناك نص محدد، تحويل كل سطر إلى اقتباس مع div container
      const lines = selectedText.split('\n').filter(line => line.trim());
      const blockquoteContent = lines.map(line => 
        `<div class="blockquote-item"><blockquote>${line.trim()}</blockquote></div>`
      ).join('\n');

      const beforeText = value.substring(0, selection.start);
      const afterText = value.substring(selection.end);
      const newText = beforeText + '\n<div class="blockquote-container">\n' + blockquoteContent + '\n</div>\n' + afterText;

      onChange(newText);
      saveToHistory(newText);

      // تحديث التحديد ليشمل النص الجديد
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(selection.start, selection.start + newText.length);
        }
      }, 0);
    } else {
      // إذا لم يكن هناك نص محدد، إدراج اقتباس جديد مع container
      const newBlockquote = '\n<div class="blockquote-container">\n<div class="blockquote-item"><blockquote>Your quote here</blockquote></div>\n</div>\n';
      insertAtCursor(newBlockquote, true);
    }
  };

  // دالة محسنة للقوائم النقطية
  const handleBulletList = () => {
    const selectedText = value.substring(selection.start, selection.end);

    if (selectedText) {
      // إذا كان هناك نص محدد، تحويل كل سطر إلى قائمة نقطية
      const lines = selectedText.split('\n').filter(line => line.trim());
      const bulletedList = `<ul>\n${lines.map(line => `  <li>${line.trim()}</li>`).join('\n')}\n</ul>`;

      const beforeText = value.substring(0, selection.start);
      const afterText = value.substring(selection.end);
      const newText = beforeText + bulletedList + afterText;

      onChange(newText);
      saveToHistory(newText);

      // تحديث التحديد ليشمل النص الجديد
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(selection.start, selection.start + bulletedList.length);
        }
      }, 0);
    } else {
      // إذا لم يكن هناك نص محدد، إدراج قائمة نقطية جديدة
      const bulletedList = `<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n  <li>Item 3</li>\n</ul>`;
      insertAtCursor(bulletedList);
    }
  };

  // دالة محسنة للقوائم الرقمية
  const handleNumberedList = () => {
    const selectedText = value.substring(selection.start, selection.end);

    if (selectedText) {
      // إذا كان هناك نص محدد، تحويل كل سطر إلى قائمة رقمية
      const lines = selectedText.split('\n').filter(line => line.trim());
      const numberedList = `<ol>\n${lines.map(line => `  <li>${line.trim()}</li>`).join('\n')}\n</ol>`;

      const beforeText = value.substring(0, selection.start);
      const afterText = value.substring(selection.end);
      const newText = beforeText + numberedList + afterText;

      onChange(newText);
      saveToHistory(newText);

      // تحديث التحديد ليشمل النص الجديد
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(selection.start, selection.start + numberedList.length);
        }
      }, 0);
    } else {
      // إذا لم يكن هناك نص محدد، إدراج قائمة رقمية جديدة
      const numberedList = `<ol>\n  <li>First item</li>\n  <li>Second item</li>\n  <li>Third item</li>\n</ol>`;
      insertAtCursor(numberedList);
    }
  };

  // دالة محسنة لزيادة المسافة البادئة
  const increaseIndent = () => {
    const selectedText = value.substring(selection.start, selection.end);

    if (selectedText) {
      // إضافة مسافة بادئة للنص المحدد
      const lines = selectedText.split('\n');
      const indentedLines = lines.map(line => `    ${line}`);
      const newText = indentedLines.join('\n');

      const beforeText = value.substring(0, selection.start);
      const afterText = value.substring(selection.end);
      const finalText = beforeText + newText + afterText;

      onChange(finalText);
      saveToHistory(finalText);

      // تحديث التحديد
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.setSelectionRange(selection.start, selection.start + newText.length);
        }
      }, 0);
    } else {
      // إضافة مسافة بادئة في الموضع الحالي
      insertAtCursor('    ');
    }
  };

  // دالة محسنة لتقليل المسافة البادئة
  const decreaseIndent = () => {
    const selectedText = value.substring(selection.start, selection.end);

    if (selectedText) {
      // إزالة المسافة البادئة من النص المحدد
      const lines = selectedText.split('\n');
      const unindentedLines = lines.map(line => line.replace(/^ {1,4}/, ''));
      const newText = unindentedLines.join('\n');

      const beforeText = value.substring(0, selection.start);
      const afterText = value.substring(selection.end);
      const finalText = beforeText + newText + afterText;

      onChange(finalText);
      saveToHistory(finalText);

      // تحديث التحديد
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          const newLength = selection.start + newText.length;
          textarea.setSelectionRange(selection.start, newLength);
        }
      }, 0);
    } else {
      // إزالة المسافة البادئة من الموضع الحالي
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const currentValue = value;
      const beforeText = currentValue.substring(0, start);

      // البحث عن المسافات البادئة قبل المؤشر
      const lines = beforeText.split('\n');
      const currentLine = lines[lines.length - 1];
      const indentMatch = currentLine.match(/^( {1,4})/);

      if (indentMatch) {
        const indentLength = indentMatch[1].length;
        const newStart = start - indentLength;
        const newValue = beforeText.substring(0, beforeText.length - indentLength) + currentValue.substring(start);

        onChange(newValue);
        saveToHistory(newValue);

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newStart, newStart);
        }, 0);
      }
    }
  };

  // إدراج رابط محسن
  const addLink = () => {
    const selectedText = value.substring(selection.start, selection.end);
    setLinkData({
      url: "",
      text: selectedText || "",
      title: "",
      target: "_blank"
    });
    setShowLinkModal(true);
  };

  const handleInsertLink = () => {
    if (!linkData.url.trim()) {
      toast.error(t("blogForm.urlRequired") || "URL is required");
      return;
    }

    const linkMarkdown = `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer">${linkData.text || linkData.url}</a>`;

    if (selection.start !== selection.end) {
      wrapSelection(`<a href="${linkData.url}" target="_blank" rel="noopener noreferrer">`, "</a>");
    } else {
      insertAtCursor(linkMarkdown);
    }

    setShowLinkModal(false);
    setLinkData({ url: "", text: "", title: "", target: "_blank" });
    toast.success(t("blogForm.linkAdded") || "Link added successfully");
  };

  // إدراج صورة محسنة
  const addImage = () => {
    setImageData({
      url: "",
      alt: "",
      title: "",
      width: "",
      height: "",
      className: ""
    });
    setShowImageModal(true);
  };

  const handleInsertImage = () => {
    if (!imageData.url.trim()) {
      toast.error(t("blogForm.imageUrlRequired") || "Image URL is required");
      return;
    }

    const imageMarkdown = `<img src="${imageData.url}" alt="${imageData.alt || ''}" style="max-width: 100%; height: auto;" />`;

    insertAtCursor(imageMarkdown);
    setShowImageModal(false);
    setImageData({ url: "", alt: "", title: "", width: "", height: "", className: "" });
    toast.success(t("blogForm.imageAdded") || "Image added successfully");
  };

  // إدراج جدول محسن مع CSS
  const addTable = () => {
    setTableData({
      rows: 3,
      cols: 3,
      withHeader: true,
      className: "",
      style: ""
    });
    setShowTableModal(true);
  };

  const handleInsertTable = () => {
    const { rows, cols, withHeader, className, style } = tableData;

    let tableHtml = '\n<table';
    if (className) tableHtml += ` class="${className}"`;
    if (style) tableHtml += ` style="${style}"`;
    tableHtml += '>\n';

    // Header row
    if (withHeader) {
      tableHtml += '<thead><tr>';
      for (let i = 0; i < cols; i++) {
        tableHtml += `<th>Header ${i + 1}</th>`;
      }
      tableHtml += '</tr></thead>\n';
    }

    // Data rows
    tableHtml += '<tbody>\n';
    const dataRows = withHeader ? rows - 1 : rows;
    for (let i = 0; i < dataRows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHtml += `<td>Cell ${i + 1}-${j + 1}</td>`;
      }
      tableHtml += '</tr>\n';
    }
    tableHtml += '</tbody>\n</table>\n';

    insertAtCursor(tableHtml);
    setShowTableModal(false);
    toast.success(t("blogForm.tableAdded") || "Table added successfully");
  };

  // إدراج CSS مخصص - تم التعديل هنا
  const addCustomCss = () => {
    setCssData({
      css: "",
      className: ""
    });
    setShowCssModal(true);
  };

  const handleInsertCss = () => {
    if (!cssData.css.trim()) {
      toast.error("CSS content is required");
      return;
    }

    const cssBlock = `\n<style>\n${cssData.css}\n</style>\n`;
    insertAtCursor(cssBlock);
    setShowCssModal(false);
    setCssData({ css: "", className: "" });
    toast.success("CSS added successfully");
  };

  // إدراج كود مخصص
  const addCustomCode = () => {
    setCodeData({
      code: ""
    });
    setShowCodeModal(true);
  };

  const handleInsertCode = () => {
    if (!codeData.code.trim()) {
      toast.error("Code content is required");
      return;
    }

    const codeBlock = `\n<code>\n${codeData.code}\n</code>\n`;
    insertAtCursor(codeBlock);
    setShowCodeModal(false);
    setCodeData({ code: "" });
    toast.success("Code block added successfully");
  };

  // تغيير لون النص مع دعم أفضل
  const changeTextColor = () => {
    wrapSelection(`<span style="color: ${customColor}">`, "</span>");
    setShowColorPicker(false);
    toast.success(t("blogForm.colorApplied") || "Color applied successfully");
  };

  // التنسيقات الأساسية - كلها HTML مباشر
  const formatAction = (type: string) => {
    switch (type) {
      case "bold":
        wrapSelection("<div class=\"\"><strong>", "</strong></div><br>", true);
        break;
      case "italic":
        wrapSelection("<div class=\"\"><em>", "</em></div><br>", true);
        break;
      case "underline":
        wrapSelection("<div class=\"\"><u>", "</u></div><br>", true);
        break;
      case "strikethrough":
        wrapSelection("<div class=\"\"><del>", "</del></div><br>", true);
        break;
      case "highlight":
        wrapSelection('<div class=\"\"><mark style="background-color: yellow">', "</mark></div><br>", true);
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
        wrapSelection("<div class=\"\"><p>", "</p></div><br>", true);
        break;
      case "bulletList":
        handleBulletList();
        break;
      case "numberedList":
        handleNumberedList();
        break;
      case "horizontalLine":
        insertAtCursor('\n<hr />\n');
        break;
      case "blockquote":
        handleBlockquote();
        break;
      case "code":
        wrapSelection('<div class=\"\"><code>', "</code></div><br>", true);
        break;
      case "inlineCode":
        wrapSelection("<div class=\"\"><code>", "</code></div><br>", true);
        break;
      case "subscript":
        wrapSelection("<sub>", "</sub></div><br>", true);
        break;
      case "superscript":
        wrapSelection("<div class=\"\"><sup>", "</sup></div><br>", true);
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
      case "increaseIndent":
        increaseIndent();
        break;
      case "decreaseIndent":
        decreaseIndent();
        break;
      default:
        break;
    }
  };

  // تصدير المحتوى
  const exportContent = () => {
    const blob = new Blob([value], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Content exported successfully");
  };

  // معاينة مباشرة - تم التعديل هنا
  const renderPreview = () => {
    let html = value;

    // استخراج CSS من <style> tags أولاً
    const styleBlocks: string[] = [];
    html = html.replace(/<style>([\s\S]*?)<\/style>/g, (match, cssContent) => {
      styleBlocks.push(cssContent);
      return '';
    });

    // CSS المخصص + CSS الافتراضي مع تعديلات الاقتباسات
    const customStyles = styleBlocks.length > 0
      ? `<style>${styleBlocks.join('\n')}</style>`
      : '';

    // CSS إضافي للعرض مع حل مشكلة القوائم والاقتباسات
    const defaultStyles = `
      <style>
        body {
          
        }
        h1, h2, h3, h4, h5, h6 {
          margin: 1.5em 0 0.5em 0;
          font-weight: bold;
          line-height: 1.3;
        }
        h1 { font-size: 2em;  }
        h2 { font-size: 1.5em;  }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1.1em; }
        h5 { font-size: 1em; }
        h6 { font-size: 0.9em;  }
        
        p {
          margin: 1em 0;
        }
        
        /* حل مشكلة القوائم - التأكد من ظهورها تحت بعض */
        ul, ol {
          display: block !important;
          width: 100% !important;
          margin: 1em 0 !important;
          padding-left: 2em !important;
          clear: both !important;
          float: none !important;
        }
        
        ul {
          list-style-type: disc !important;
        }
        
        ol {
          list-style-type: decimal !important;
        }
        
        li {
          display: list-item !important;
          margin: 0.5em 0 !important;
          float: none !important;
          clear: both !important;
        }
        
        /* التأكد من أن القوائم تظهر تحت بعض وليس بجانب بعض */
        ul + ul, ul + ol, ol + ul, ol + ol {
          margin-top: 1.5em !important;
          clear: both !important;
        }
        
        /* منع أي تخطيط أفقي للقوائم */
        .list-container, [class*="list"] {
          display: block !important;
          width: 100% !important;
          clear: both !important;
        }
        
        /* حل مشكلة الاقتباسات - التأكد من ظهورها تحت بعض */
        .blockquote-container {
          display: block !important;
          width: 100% !important;
          clear: both !important;
          margin: 1em 0 !important;
        }
        
        .blockquote-item {
          display: block !important;
          width: 100% !important;
          clear: both !important;
          margin: 0.5em 0 !important;
        }
        
        blockquote {
          display: block !important;
          width: 100% !important;
          clear: both !important;
          margin: 0.5em 0 !important;
          padding: 1em 1.5em !important;
          border-left: 4px solid #8c52ff !important;
          background-color: #f8f9fa !important;
          color: #555 !important;
          font-style: italic !important;
        }
        
        /* التأكد من أن الاقتباسات تظهر تحت بعض */
        .blockquote-item + .blockquote-item {
          margin-top: 1em !important;
        }
        
        a {
          color: #0366d6;
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
        
        img {
          margin: 1em 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-width: 100%;
          height: auto;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          border: 1px solid #8c52ff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        th, td {
          border: 1px solid #8c52ff;
          padding: 12px;
          text-align: left;
        }
        
        th {
          background-color: #8c52ff;
          font-weight: bold;
          color: black;
        }
        thead th{
        color: white;
        }
        hr {
          border: none;
          border-top: 2px solid #eee;
          margin: 2em 0;
        }
        
        mark {
          background-color: yellow;
        }
        
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
      </style>
    `;

    // دمج الـ CSS المخصص مع الـ default styles
    html = customStyles + defaultStyles + html;

    return { __html: html };
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
          disabled: historyIndex === 0
        },
        {
          icon: Redo,
          action: "redo",
          title: t("blogForm.redo") || "Redo",
          customAction: handleRedo,
          disabled: historyIndex === history.length - 1
        },
        {
          icon: Save,
          action: "export",
          title: "Export",
          customAction: exportContent
        },
      ]
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
      ]
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
      ]
    },
    {
      name: "lists",
      buttons: [
        {
          icon: List,
          action: "bulletList",
          title: t("blogForm.bulletList") || "Bullet List",
          customAction: handleBulletList
        },
        {
          icon: ListOrdered,
          action: "numberedList",
          title: t("blogForm.numberedList") || "Numbered List",
          customAction: handleNumberedList
        },
        {
          icon: Indent,
          action: "increaseIndent",
          title: t("blogForm.increaseIndent") || "Increase Indent",
          customAction: increaseIndent
        },
        {
          icon: Outdent,
          action: "decreaseIndent",
          title: t("blogForm.decreaseIndent") || "Decrease Indent",
          customAction: decreaseIndent
        },
      ]
    },
    {
      name: "insert",
      buttons: [
        { icon: Link, action: "link", title: t("blogForm.link") || "Insert Link", customAction: addLink },
        { icon: ImageIcon, action: "image", title: t("blogForm.image") || "Insert Image", customAction: addImage },
        { icon: Table, action: "table", title: t("blogForm.table") || "Insert Table", customAction: addTable },
        { icon: Code, action: "customCode", title: "Insert Code", customAction: addCustomCode },
        { icon: Minus, action: "horizontalLine", title: t("blogForm.horizontalLine") || "Horizontal Line" },
        {
          icon: Quote,
          action: "blockquote",
          title: t("blogForm.blockquote") || "Blockquote",
          customAction: handleBlockquote
        },
      ]
    },
    {
      name: "alignment",
      buttons: [
        { icon: AlignLeft, action: "alignLeft", title: t("blogForm.alignLeft") || "Align Left" },
        { icon: AlignCenter, action: "alignCenter", title: t("blogForm.alignCenter") || "Align Center" },
        { icon: AlignRight, action: "alignRight", title: t("blogForm.alignRight") || "Align Right" },
      ]
    }
  ];

  return (
    <>
      <div className={`border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden bg-white dark:bg-darkmode transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50' : 'relative'
        }`}>
        {/* Toolbar */}
        <div className="border-b border-PowderBlueBorder dark:border-dark_border bg-IcyBreeze dark:bg-dark_input">
          {/* Main Toolbar */}
          <div className="p-3 border-b border-PowderBlueBorder dark:border-dark_border">
            <div className="flex flex-wrap gap-1">
              {toolbarGroups.map((group, groupIndex) => (
                <div key={group.name} className="flex items-center gap-1">
                  {group.buttons.map(({ icon: Icon, action, title, customAction, disabled }) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => customAction ? customAction() : formatAction(action)}
                      title={title}
                      disabled={disabled || false}
                      className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${disabled
                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                        : 'hover:bg-white dark:hover:bg-darkmode text-MidnightNavyText dark:text-white'
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

              {/* Color Picker Button */}
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

                  {/* Color Picker Dropdown */}
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
                          className="px-3 py-1.5 border border-PowderBlueBorder dark:border-dark_border text-xs rounded hover:bg-gray-50 dark:hover:bg-darkmode transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fullscreen Toggle */}
              <div className="flex items-center gap-1">
                <div className="w-px h-4 bg-PowderBlueBorder dark:bg-dark_border mx-1"></div>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-darkmode transition-colors text-MidnightNavyText dark:text-white"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Toggle */}
          <div className="px-3 py-2 flex justify-between items-center">
            <div className="text-xs text-SlateBlueText dark:text-darktext">
              <strong>{t("blogForm.supportedFormats") || "Supported formats"}:</strong> HTML & CSS
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${showPreview
                ? "bg-primary text-white"
                : "bg-IcyBreeze dark:bg-dark_input text-MidnightNavyText dark:text-white hover:bg-primary hover:text-white"
                }`}
            >
              <Eye className="w-3 h-3" />
              {showPreview ? t("blogForm.showEditor") || "Show Editor" : t("blogForm.showPreview") || "Show Preview"}
            </button>
          </div>
        </div>

        {/* Editor/Preview Area */}
        <div className="relative">
          {showPreview ? (
            // Preview Mode
            <div
              ref={previewRef}
              className="min-h-[300px] p-6 bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white overflow-auto"
              style={{
                maxHeight: isFullscreen ? 'calc(100vh - 200px)' : 'none',
                height: isFullscreen ? 'calc(100vh - 200px)' : 'auto'
              }}
              dangerouslySetInnerHTML={renderPreview()}
            />
          ) : (
            // Editor Mode
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
              }}
              onSelect={handleTextSelect}
              placeholder={placeholder}
              rows={15}
              className="w-full px-4 py-3 border-0 outline-none focus:ring-0 dark:bg-dark_input dark:text-white text-sm resize-none font-mono min-h-[300px]"
              style={{
                maxHeight: isFullscreen ? 'calc(100vh - 200px)' : 'none',
                height: isFullscreen ? 'calc(100vh - 200px)' : 'auto'
              }}
            />
          )}
        </div>

        {/* Character Count & Help */}
        <div className="px-4 py-2 bg-IcyBreeze dark:bg-dark_input border-t border-PowderBlueBorder dark:border-dark_border text-xs text-SlateBlueText dark:text-darktext flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <strong>{t("blogForm.quickReference") || "Quick reference"}:</strong>
              {" "}<strong>&lt;strong&gt;Bold&lt;/strong&gt;</strong> •
              {" "}<em>&lt;em&gt;Italic&lt;/em&gt;</em> •
              {" "}&lt;h1&gt;Heading&lt;/h1&gt;
            </div>
            <button
              type="button"
              onClick={addCustomCss}
              className="text-primary hover:text-primary/80 font-medium"
            >
              + Add CSS
            </button>
          </div>
          <div className="text-xs flex items-center gap-4">
            <span>
              {value.length} {t("blogForm.characters") || "characters"}
            </span>
            <span>
              {value.split(/\s+/).filter(word => word.length > 0).length} {t("blogForm.words") || "words"}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darkmode rounded-lg w-full max-w-md border border-PowderBlueBorder dark:border-dark_border">
            <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border">
              <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                {t("blogForm.insertLink") || "Insert Link"}
              </h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-SlateBlueText hover:text-MidnightNavyText dark:text-darktext dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                  {t("blogForm.linkText") || "Link Text"}
                </label>
                <input
                  type="text"
                  value={linkData.text}
                  onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("blogForm.enterLinkText") || "Enter link text"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                  {t("blogForm.url") || "URL"} *
                </label>
                <input
                  type="url"
                  value={linkData.url}
                  onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-PowderBlueBorder dark:border-dark_border">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white transition-colors"
              >
                {t("blogForm.cancel") || "Cancel"}
              </button>
              <button
                onClick={handleInsertLink}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t("blogForm.insertLink") || "Insert Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darkmode rounded-lg w-full max-w-md border border-PowderBlueBorder dark:border-dark_border">
            <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border">
              <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                {t("blogForm.insertImage") || "Insert Image"}
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-SlateBlueText hover:text-MidnightNavyText dark:text-darktext dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                  {t("blogForm.imageUrl") || "Image URL"} *
                </label>
                <input
                  type="url"
                  value={imageData.url}
                  onChange={(e) => setImageData({ ...imageData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                  {t("blogForm.altText") || "Alt Text"}
                </label>
                <input
                  type="text"
                  value={imageData.alt}
                  onChange={(e) => setImageData({ ...imageData, alt: e.target.value })}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("blogForm.enterImageAlt") || "Enter image alt text"}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-PowderBlueBorder dark:border-dark_border">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white transition-colors"
              >
                {t("blogForm.cancel") || "Cancel"}
              </button>
              <button
                onClick={handleInsertImage}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t("blogForm.insertImage") || "Insert Image"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darkmode rounded-lg w-full max-w-md border border-PowderBlueBorder dark:border-dark_border">
            <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border">
              <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                {t("blogForm.insertTable") || "Insert Table"}
              </h3>
              <button
                onClick={() => setShowTableModal(false)}
                className="text-SlateBlueText hover:text-MidnightNavyText dark:text-darktext dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                    {t("blogForm.rows") || "Rows"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={tableData.rows}
                    onChange={(e) => setTableData({ ...tableData, rows: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                    {t("blogForm.columns") || "Columns"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tableData.cols}
                    onChange={(e) => setTableData({ ...tableData, cols: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-PowderBlueBorder dark:border-dark_border">
              <button
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white transition-colors"
              >
                {t("blogForm.cancel") || "Cancel"}
              </button>
              <button
                onClick={handleInsertTable}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t("blogForm.insertTable") || "Insert Table"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Modal */}
      {showCssModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darkmode rounded-lg w-full max-w-2xl border border-PowderBlueBorder dark:border-dark_border">
            <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border">
              <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                Insert Custom CSS
              </h3>
              <button
                onClick={() => setShowCssModal(false)}
                className="text-SlateBlueText hover:text-MidnightNavyText dark:text-darktext dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                  CSS Code *
                </label>
                <textarea
                  value={cssData.css}
                  onChange={(e) => setCssData({ ...cssData, css: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="h1 {
  color: #8c52ff;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-PowderBlueBorder dark:border-dark_border">
              <button
                onClick={() => setShowCssModal(false)}
                className="px-4 py-2 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertCss}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Insert CSS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darkmode rounded-lg w-full max-w-2xl border border-PowderBlueBorder dark:border-dark_border">
            <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border">
              <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                Insert Code Block
              </h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-SlateBlueText hover:text-MidnightNavyText dark:text-darktext dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                  HTML Code *
                </label>
                <textarea
                  value={codeData.code}
                  onChange={(e) => setCodeData({ ...codeData, code: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="<!-- Enter your HTML code here -->"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-PowderBlueBorder dark:border-dark_border">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-2 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertCode}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Insert Code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}