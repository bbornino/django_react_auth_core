import { useState, type ReactNode } from "react"
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import CharacterCount from "@tiptap/extension-character-count"
import Subscript from "@tiptap/extension-subscript"
import SuperScript from "@tiptap/extension-superscript"
import Highlight from "@tiptap/extension-highlight"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { createLowlight } from "lowlight"
import python from "highlight.js/lib/languages/python"
import typescript from "highlight.js/lib/languages/typescript"
import javascript from "highlight.js/lib/languages/javascript"
import bash from "highlight.js/lib/languages/bash"
import json from "highlight.js/lib/languages/json"
import { Undo2, Redo2, Bold, Italic, UnderlineIcon, Strikethrough, Code, Subscript as SubIcon,
    Superscript as SupIcon, Highlighter, Link as LinkIcon, Quote, Minus, List, ListOrdered, 
    IndentIncrease, IndentDecrease, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
    FileCode, SquareCode,
} from "lucide-react"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { SelectInput } from "./select-input"
import { FieldError } from "./field-error"

const lowlight = createLowlight()
lowlight.register({ python, typescript, javascript, bash, json})

const HEADING_OPTIONS = [
    { value: "paragraph", label: "Paragraph" },
    { value: "1", label: "Heading 1" },
    { value: "2", label: "Heading 2" },
    { value: "3", label: "Heading 3" },
]

const CODE_LANGUAGE_OPTIONS = [
    { value: "python", label: "Python"},
    { value: "typescript", label: "TypeScript" },
    { value: "javascript", label: "JavaScript" },
    { value: "bash", label: "Bash" },
    { value: "json", label: "JSON"},    
]

function Divider() {
    return <div className="w=px bg-border self-strtch mx-1" />
}

function ToolbarButton({ label, active, disabled, onClick, children }: {
    label: string
    active?: boolean
    disabled?: boolean
    onClick: () => void
    children: ReactNode
}) {
    return (
        <Tooltip>
            <TooltipTrigger render={
                <Button type="button" size="sm" disabled={disabled}
                    variant={active ? "default" : "outline"}
                    aria-label={label}
                    onClick={onClick}>
                        {children}
                    </Button>
            } />
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    )
}

function Toolbar({ editor, htmlMode, onToggleHtmlMode  } : { 
    editor: Editor | null
    htmlMode: boolean
    onToggleHtmlMode: () => void
}) {
    if (!editor) return null

    const headingValue = editor.isActive("heading", { level: 1}) ? "1" 
        : editor.isActive("heading", { level: 2 }) ? "2" 
        : editor.isActive("heading", { level: 3}) ? "3"
        : "paragraph"

    const setHeading = (value: string) => {
        if (value === "paragraph") {
            editor.chain().focus().setParagraph().run()
        } else {
            editor.chain().focus().toggleHeading({ level: Number(value) as 1 | 2 | 3 }).run()
        }
    }

    const setLink = () => {
        const url = window.prompt("URL")
        if (url) editor.chain().focus().setLink({ href: url }).run()
    }

    // Buttons still work while in HTML mode (they're harmless: editor state
    // just is not visible), but disabling them keeps the UI honest about
    // which view is actually "live" right now.
    const disabled = htmlMode

    return (
        <div className="flex flex-wrap items-center gap-1 border-b p-1">
            <ToolbarButton label="Undo" disabled={disabled} 
                    onClick={() => editor.chain().focus().undo().run()}>
                <Undo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Redo" disabled={disabled} 
                    onClick={() => editor.chain().focus().redo().run()}>
                <Redo2 className="size-4" />
            </ToolbarButton>
            
            <Divider />

            <SelectInput
                value={headingValue}
                onValueChange={setHeading}
                options={HEADING_OPTIONS}
                className="w-32 h-8"
                />

            <Divider />

            <ToolbarButton label="Bold" disabled={disabled} 
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Italic" disabled={disabled} 
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic className="size-4" />
            </ToolbarButton>            
            <ToolbarButton label="Underline" disabled={disabled} 
                    active={editor.isActive("underline")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Strikethrough" disabled={disabled} 
                    active={editor.isActive("strike")}
                    onClick={() => editor.chain().focus().toggleStrike().run()}>
                <Strikethrough className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Inline Code snippet, e.g. npm install" disabled={disabled} 
                    active={editor.isActive("code")}
                    onClick={() => editor.chain().focus().toggleCode().run()}>
                <Code className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Subscript" disabled={disabled} 
                    active={editor.isActive("subscript")}
                    onClick={() => editor.chain().focus().toggleSubscript().run()}>
                <SubIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Superscript" disabled={disabled} 
                    active={editor.isActive("superscript")}
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}>
                <SupIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Highlight" disabled={disabled} 
                    active={editor.isActive("highlight")}
                    onClick={() => editor.chain().focus().toggleHighlight().run()}>
                <Highlighter className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Link" disabled={disabled} 
                    active={editor.isActive("link")}
                    onClick={setLink}>
                <LinkIcon className="size-4" />
            </ToolbarButton>


            <Divider />

            <ToolbarButton label="Blockquote" disabled={disabled} 
                    active={editor.isActive("blockquote")}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <Quote className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Horizontal Rule" disabled={disabled} 
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <Minus className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Code Block" disabled={disabled} 
                    active={editor.isActive("codeBlock")}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                <SquareCode className="size-4" />
            </ToolbarButton>
            {editor.isActive("codeBlock") && (
                <SelectInput
                    value={(editor.getAttributes("codeBlock").language as string) ?? "python"}
                    onValueChange={(lang) =>editor.chain().focus().updateAttributes("codeBlock", {language: lang}).run()}
                    options={CODE_LANGUAGE_OPTIONS}
                    className="w-32 h-8"
                />
            )}
            
            <Divider />

            <ToolbarButton label="Bullet List" disabled={disabled} 
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Numbered List" disabled={disabled} 
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Indent (nest list item)" disabled={disabled} 
                    onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
                <IndentIncrease className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Outdent (un-nest list item)" disabled={disabled} 
                    onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
                <IndentDecrease className="size-4" />
            </ToolbarButton>
            
            <Divider />

            <ToolbarButton label="Align Left" disabled={disabled} 
                    active={editor.isActive("left")}
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                <AlignLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Align Center" disabled={disabled} 
                    active={editor.isActive("center")}
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                <AlignCenter className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Align Right" disabled={disabled} 
                    active={editor.isActive("right")}
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                <AlignRight className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Align Justify" disabled={disabled} 
                    active={editor.isActive("justify")}
                    onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
                <AlignJustify className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="View HTML Source"
                    active={htmlMode}
                    onClick={onToggleHtmlMode}>
                <FileCode className="size-4" />
            </ToolbarButton>
        </div>
    )
}

function TiptapEditor({ value, onChange }: { value: string; onChange: (html: string) => void}) {
    const [htmlMode, setHtmlMode] = useState(false)
    const [htmlDraft, setHtmlDraft] = useState(value)

    const editor = useEditor({
        immediatelyRender: true,
        extensions: [
            StarterKit.configure({ link: false, codeBlock: false}),
            CharacterCount,
            Subscript,
            SuperScript,
            Highlight,
            Link.configure({ openOnClick: false}),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            CodeBlockLowlight.configure({ lowlight }),
        ],
        content: value,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: { class: "prose prose-sm max-w-none p-3 min-h-32 focus: outline-none"},
        },
    })

    const toggleHtmlMode = () => {
        if (!editor) return
        if (!htmlMode) {
            // entering source view: seed the textarea from the editor's current, real content
            setHtmlDraft(editor.getHTML())
        } else {
            // Leaving source view: whatevver was typed becomes the new source of truth, resyncing the
            // visual editor to match: this is what keeps HTML and WYSIWYG from ever silently diverging.
            editor.commands.setContent(htmlDraft)
            onChange(htmlDraft)
        }
        setHtmlMode(!htmlMode)
    }

    return (
        <div className="rounded-lg border">
            <Toolbar editor={editor} htmlMode={htmlMode} onToggleHtmlMode={toggleHtmlMode} />
            <div className={htmlMode ? "hidden" : ""}>
                <EditorContent editor={editor} />
            </div>
            {htmlMode && (
                <Textarea
                    data-testid="editor-html-source"
                    value={htmlDraft}
                    onChange={(e) => setHtmlDraft(e.target.value)}
                    className="min-h-32 rounded-none border-0 font-mono text-xs"
                />
            )}
            {editor && (
                <p className="text-xs text-muted-foreground text-right px-3 pb-2">
                    {editor.storage.characterCount.words()} words · {editor.storage.characterCount.characters()} characters
                </p>
            )}
        </div>
    )
}


type EditorFieldProps<T extends FieldValues> = {
    label: string
    id: Path<T>
    control: Control<T>
    error?: string
}

export function EditorField<T extends FieldValues>({ label, id, control, error }: EditorFieldProps<T>) {
    return (
        <Controller
            name={id}
            control={control}
            render={({ field }) => (
                <div className="space-y-1">
                    <Label htmlFor="{id}">{label}</Label>
                    <TiptapEditor value={field.value ?? ""} onChange={field.onChange} />
                    <FieldError message={error} />
                </div>
            )}
        />
    )
}
