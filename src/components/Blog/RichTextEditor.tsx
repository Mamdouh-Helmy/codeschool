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
}

interface ImageModalData {
  url: string;
  alt: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder 
}: RichTextEditorProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [customColor, setCustomColor] = useState("#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // States for modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkData, setLinkData] = useState<LinkModalData>({ url: "", text: "" });
  const [imageData, setImageData] = useState<ImageModalData>({ url: "", alt: "" });

  // حفظ في الـ history
  const saveToHistory = (newValue: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  const handleTextSelect = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      setSelection({
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      });
    }
  };

  const wrapSelection = (before: string, after: string = before) => {
    const text = value;
    const beforeText = text.substring(0, selection.start);
    const selectedText = text.substring(selection.start, selection.end);
    const afterText = text.substring(selection.end);

    const newText = beforeText + before + selectedText + after + afterText;
    onChange(newText);
    saveToHistory(newText);

    // تحديث التحديد
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newPosition = selection.start + before.length;
        textarea.focus();
        textarea.setSelectionRange(newPosition, newPosition + selectedText.length);
      }
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    onChange(newValue);
    saveToHistory(newValue);
    
    // تحديث موضع المؤشر
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  // إضافة رابط - باستخدام المودال
  const addLink = () => {
    // الحصول على النص المحدد إن وجد
    const selectedText = value.substring(selection.start, selection.end);
    setLinkData({
      url: "",
      text: selectedText || ""
    });
    setShowLinkModal(true);
  };

  const handleInsertLink = () => {
    if (!linkData.url.trim()) {
      toast.error(t("blogForm.urlRequired") || "URL is required");
      return;
    }

    const linkMarkdown = `[${linkData.text || linkData.url}](${linkData.url})`;
    
    if (selection.start !== selection.end) {
      // إذا كان هناك نص محدد
      wrapSelection("[", `](${linkData.url})`);
    } else {
      // إذا لا يوجد نص محدد
      insertAtCursor(linkMarkdown);
    }
    
    setShowLinkModal(false);
    setLinkData({ url: "", text: "" });
    toast.success(t("blogForm.linkAdded") || "Link added successfully");
  };

  // إضافة صورة - باستخدام المودال
  const addImage = () => {
    setImageData({ url: "", alt: "" });
    setShowImageModal(true);
  };

  const handleInsertImage = () => {
    if (!imageData.url.trim()) {
      toast.error(t("blogForm.imageUrlRequired") || "Image URL is required");
      return;
    }

    const imageMarkdown = `![${imageData.alt || ""}](${imageData.url})`;
    insertAtCursor(imageMarkdown);
    
    setShowImageModal(false);
    setImageData({ url: "", alt: "" });
    toast.success(t("blogForm.imageAdded") || "Image added successfully");
  };

  // تغيير لون النص
  const changeTextColor = () => {
    wrapSelection(`<span style="color: ${customColor}">`, "</span>");
    setShowColorPicker(false);
    toast.success(t("blogForm.colorApplied") || "Color applied successfully");
  };

  const formatAction = (type: string) => {
    switch (type) {
      case "bold":
        wrapSelection("**", "**");
        break;
      case "italic":
        wrapSelection("*", "*");
        break;
      case "underline":
        wrapSelection("<u>", "</u>");
        break;
      case "strikethrough":
        wrapSelection("~~", "~~");
        break;
      case "highlight":
        wrapSelection('<mark style="background-color: yellow">', "</mark>");
        break;
      case "heading1":
        wrapSelection("# ", "");
        break;
      case "heading2":
        wrapSelection("## ", "");
        break;
      case "heading3":
        wrapSelection("### ", "");
        break;
      case "paragraph":
        insertAtCursor("\n\n");
        break;
      case "bulletList":
        wrapSelection("\n- ", "");
        break;
      case "numberedList":
        wrapSelection("\n1. ", "");
        break;
      case "horizontalLine":
        insertAtCursor("\n\n---\n\n");
        break;
      case "blockquote":
        wrapSelection("\n> ", "");
        break;
      case "code":
        wrapSelection("```\n", "\n```");
        break;
      case "inlineCode":
        wrapSelection("`", "`");
        break;
      case "alignLeft":
        wrapSelection('<div style="text-align: left">', "</div>");
        break;
      case "alignCenter":
        wrapSelection('<div style="text-align: center">', "</div>");
        break;
      case "alignRight":
        wrapSelection('<div style="text-align: right">', "</div>");
        break;
      default:
        break;
    }
  };

  // تحويل Markdown/HTML إلى HTML للعرض
  const renderPreview = () => {
    let html = value
      // Markdown headings
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.*?)~~/gim, '<del>$1</del>')
      // Links
      .replace(/\[([^\[]+)\]\(([^\)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
      // Images
      .replace(/!\[([^\[]+)\]\(([^\)]+)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
      // Blockquotes
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Horizontal Rule
      .replace(/^\-\-\-$/gim, '<hr />')
      // Lists
      .replace(/^\n\* (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/^\n\- (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/^\n\d\. (.*$)/gim, '<ol><li>$1</li></ol>')
      // Code blocks
      .replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      // Paragraphs
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br />');

    // إضافة فقرات
    html = `<p>${html}</p>`;

    return { __html: html };
  };

  const toolbarGroups = [
    {
      name: "history",
      buttons: [
        { icon: Undo, action: "undo", title: t("blogForm.undo") || "Undo", customAction: handleUndo },
        { icon: Redo, action: "redo", title: t("blogForm.redo") || "Redo", customAction: handleRedo },
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
      ]
    },
    {
      name: "headings",
      buttons: [
        { icon: Heading1, action: "heading1", title: t("blogForm.heading1") || "Heading 1" },
        { icon: Heading2, action: "heading2", title: t("blogForm.heading2") || "Heading 2" },
        { icon: Heading3, action: "heading3", title: t("blogForm.heading3") || "Heading 3" },
        { icon: Pilcrow, action: "paragraph", title: t("blogForm.paragraph") || "Paragraph" },
      ]
    },
    {
      name: "lists",
      buttons: [
        { icon: List, action: "bulletList", title: t("blogForm.bulletList") || "Bullet List" },
        { icon: ListOrdered, action: "numberedList", title: t("blogForm.numberedList") || "Numbered List" },
      ]
    },
    {
      name: "insert",
      buttons: [
        { icon: Link, action: "link", title: t("blogForm.link") || "Insert Link", customAction: addLink },
        { icon: ImageIcon, action: "image", title: t("blogForm.image") || "Insert Image", customAction: addImage },
        { icon: Minus, action: "horizontalLine", title: t("blogForm.horizontalLine") || "Horizontal Line" },
        { icon: Quote, action: "blockquote", title: t("blogForm.blockquote") || "Blockquote" },
        { icon: Code, action: "code", title: t("blogForm.codeBlock") || "Code Block" },
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
      <div className="border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden bg-white dark:bg-darkmode">
        {/* Toolbar */}
        <div className="border-b border-PowderBlueBorder dark:border-dark_border bg-IcyBreeze dark:bg-dark_input">
          {/* Main Toolbar */}
          <div className="p-3 border-b border-PowderBlueBorder dark:border-dark_border">
            <div className="flex flex-wrap gap-1">
              {toolbarGroups.map((group, groupIndex) => (
                <div key={group.name} className="flex items-center gap-1">
                  {group.buttons.map(({ icon: Icon, action, title, customAction }) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => customAction ? customAction() : formatAction(action)}
                      title={title}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-white dark:hover:bg-darkmode transition-colors text-MidnightNavyText dark:text-white"
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
                    <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg z-50">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="w-8 h-8 cursor-pointer"
                        />
                        <span className="text-xs text-MidnightNavyText dark:text-white">
                          {customColor}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={changeTextColor}
                        className="w-full px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
                      >
                        {t("blogForm.applyColor") || "Apply Color"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Toggle */}
          <div className="px-3 py-2 flex justify-between items-center">
            <div className="text-xs text-SlateBlueText dark:text-darktext">
              <strong>{t("blogForm.supportedFormats") || "Supported formats"}:</strong> Markdown & HTML
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                showPreview 
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
              className="min-h-[300px] p-4 prose dark:prose-invert max-w-none bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              dangerouslySetInnerHTML={renderPreview()}
            />
          ) : (
            // Editor Mode
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                saveToHistory(e.target.value);
              }}
              onSelect={handleTextSelect}
              placeholder={placeholder}
              rows={15}
              className="w-full px-4 py-3 border-0 outline-none focus:ring-0 dark:bg-dark_input dark:text-white text-sm resize-none font-mono min-h-[300px]"
            />
          )}
        </div>

        {/* Character Count & Help */}
        <div className="px-4 py-2 bg-IcyBreeze dark:bg-dark_input border-t border-PowderBlueBorder dark:border-dark_border text-xs text-SlateBlueText dark:text-darktext flex justify-between items-center">
          <div>
            <strong>{t("blogForm.quickReference") || "Quick reference"}:</strong> 
            {" "}<strong>**Bold**</strong> • 
            {" "}<em>*Italic*</em> • 
            {" "}<del>~~Strikethrough~~</del> • 
            {" "}<code>`Code`</code>
          </div>
          <div className="text-xs">
            {value.length} {t("blogForm.characters") || "characters"}
          </div>
        </div>
      </div>

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
                  placeholder={t("blogForm.enterUrl") || "Enter URL"}
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
                  placeholder={t("blogForm.enterImageUrl") || "Enter image URL"}
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
    </>
  );
}