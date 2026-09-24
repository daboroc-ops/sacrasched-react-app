import { useEffect, useRef, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBold, faItalic, faUnderline, faStrikethrough, faListUl, faListOl, faQuoteLeft,
    faAlignLeft, faAlignCenter, faAlignRight, faLink, faLinkSlash, faImage, faMinus,
    faRotateLeft, faRotateRight, faEraser, faHeading, faParagraph,
} from '@fortawesome/free-solid-svg-icons';
import MediaPicker from './MediaPicker';

/**
 * A what-you-see-is-what-you-get editor for a parish post.
 *
 * A contentEditable surface with a toolbar — no editor library, nothing to
 * configure. It emits HTML; the server keeps only the tags a post needs
 * (utils/postHtml on the API), so what the office types is what the page
 * shows, and nothing else gets through.
 *
 * Pasting drops the formatting of wherever the text came from: a paragraph
 * copied out of Word arrives as plain text and takes the page's own style.
 */
const exec = (cmd, arg = null) => document.execCommand(cmd, false, arg);

const BLOCKS = [
    { value: 'p',  label: 'Paragraph', icon: faParagraph },
    { value: 'h2', label: 'Heading',   icon: faHeading },
    { value: 'h3', label: 'Subheading', icon: faHeading, small: true },
];

/* Uploaded pictures are stored as /uploads/… and served through the API */
const toPublic = src => src.replace(/^\/api\/uploads\//, '/uploads/');

/* One toolbar button: runs its command, or its own handler. mousedown is
   swallowed so the selection in the
   editor survives the click. */
function ToolBtn({ on, title, icon, cmd, arg, run, onClick }) {
    return (
        <button type="button" className={`rte__btn${on ? ' rte__btn--on' : ''}`} title={title} aria-label={title}
                onMouseDown={e => e.preventDefault()} onClick={onClick || (() => run(cmd, arg))}>
            <FontAwesomeIcon icon={icon} />
        </button>
    );
}

export default function RichEditor({ value = '', onChange, placeholder = 'Write the post…', minHeight = 320 }) {
    const box = useRef(null);
    const last = useRef(null);            // the HTML we last emitted or set
    /* Where the caret was the last time it was inside the editor. Opening
       a dialog moves the selection out of the editor entirely, so without
       this an inserted picture lands wherever the browser left off. */
    const caret = useRef(null);
    const [picking, setPicking] = useState(false);
    const [state, setState] = useState({});  // which toolbar buttons read "on"

    /* Take the outside value only when it is not what we already hold —
       resetting innerHTML on every keystroke would throw the caret away. */
    useEffect(() => {
        if (!box.current || value === last.current) return;
        box.current.innerHTML = value || '';
        last.current = value;
    }, [value]);

    const emit = useCallback(() => {
        if (!box.current) return;
        const html = box.current.innerHTML;
        last.current = html;
        onChange?.(html);
    }, [onChange]);

    /* Reflect the selection in the toolbar */
    const refresh = useCallback(() => {
        if (!box.current || !box.current.contains(document.activeElement)) return;
        /* Keep the caret while it is ours to keep */
        const sel = window.getSelection();
        if (sel?.rangeCount && box.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            caret.current = sel.getRangeAt(0).cloneRange();
        }

        const block = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '');
        setState({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strike: document.queryCommandState('strikeThrough'),
            ul: document.queryCommandState('insertUnorderedList'),
            ol: document.queryCommandState('insertOrderedList'),
            left: document.queryCommandState('justifyLeft'),
            center: document.queryCommandState('justifyCenter'),
            right: document.queryCommandState('justifyRight'),
            block: ['h2', 'h3', 'blockquote'].includes(block) ? block : 'p',
        });
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', refresh);
        return () => document.removeEventListener('selectionchange', refresh);
    }, [refresh]);

    const run = (cmd, arg) => { box.current?.focus(); exec(cmd, arg); emit(); refresh(); };

    const link = () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return window.alert('Select the words that should become the link first.');
        const url = window.prompt('Link address (https://…)');
        if (url) run('createLink', /^(https?:|mailto:|tel:)/.test(url) ? url : `https://${url}`);
    };

    /* Put the caret back where the writer left it, so the picture goes
       between the paragraphs they were standing in rather than at the top.
       If there is nothing to restore — the picker was opened before the
       editor was ever clicked — it goes at the end, which is where someone
       who has not placed a caret would expect it. */
    const restoreCaret = () => {
        box.current?.focus();
        const range = caret.current;
        const sel = window.getSelection();
        if (!sel) return;

        if (range && box.current?.contains(range.commonAncestorContainer)) {
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }
        const end = document.createRange();
        end.selectNodeContents(box.current);
        end.collapse(false);
        sel.removeAllRanges();
        sel.addRange(end);
    };

    const insertImage = asset => {
        setPicking(false);
        restoreCaret();
        const src = toPublic(asset.url);
        exec('insertHTML', `<figure><img src="${src}" alt="${(asset.alt || '').replace(/"/g, '&quot;')}"></figure><p><br></p>`);
        emit();
        // The insertion moved the caret; that is the one worth keeping now
        refresh();
    };

    /* Pasted text comes in clean */
    const onPaste = e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        exec('insertText', text);
        emit();
    };


    return (
        <div className="rte">
            <div className="rte__bar" role="toolbar" aria-label="Formatting">
                <select className="rte__block" value={state.block || 'p'} title="Text style"
                        onMouseDown={e => e.stopPropagation()}
                        onChange={e => run('formatBlock', e.target.value === 'p' ? 'p' : e.target.value)}>
                    {BLOCKS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    <option value="blockquote">Quote</option>
                </select>
                <span className="rte__sep" />
                <ToolBtn run={run} on={state.bold}      title="Bold"          icon={faBold}          cmd="bold" />
                <ToolBtn run={run} on={state.italic}    title="Italic"        icon={faItalic}        cmd="italic" />
                <ToolBtn run={run} on={state.underline} title="Underline"     icon={faUnderline}     cmd="underline" />
                <ToolBtn run={run} on={state.strike}    title="Strikethrough" icon={faStrikethrough} cmd="strikeThrough" />
                <span className="rte__sep" />
                <ToolBtn run={run} on={state.ul} title="Bulleted list" icon={faListUl} cmd="insertUnorderedList" />
                <ToolBtn run={run} on={state.ol} title="Numbered list" icon={faListOl} cmd="insertOrderedList" />
                <ToolBtn run={run} on={state.block === 'blockquote'} title="Quote" icon={faQuoteLeft} cmd="formatBlock" arg="blockquote" />
                <span className="rte__sep" />
                <ToolBtn run={run} on={state.left}   title="Align left"   icon={faAlignLeft}   cmd="justifyLeft" />
                <ToolBtn run={run} on={state.center} title="Centre"       icon={faAlignCenter} cmd="justifyCenter" />
                <ToolBtn run={run} on={state.right}  title="Align right"  icon={faAlignRight}  cmd="justifyRight" />
                <span className="rte__sep" />
                <ToolBtn run={run} title="Link"        icon={faLink}      onClick={link} />
                <ToolBtn run={run} title="Remove link" icon={faLinkSlash} cmd="unlink" />
                <ToolBtn run={run} title="Put a picture here" icon={faImage} onClick={() => setPicking(true)} />
                <ToolBtn run={run} title="Divider"     icon={faMinus}     cmd="insertHorizontalRule" />
                <span className="rte__sep" />
                <ToolBtn run={run} title="Undo" icon={faRotateLeft}  cmd="undo" />
                <ToolBtn run={run} title="Redo" icon={faRotateRight} cmd="redo" />
                <ToolBtn run={run} title="Clear formatting" icon={faEraser} cmd="removeFormat" />
            </div>

            <div
                ref={box}
                className="rte__body"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder}
                style={{ minHeight }}
                onInput={emit}
                onBlur={emit}
                onPaste={onPaste}
                onKeyUp={refresh}
                onMouseUp={refresh}
            />

            {picking && (
                <MediaPicker
                    title="Put a picture in the post"
                    onPick={insertImage}
                    onClose={() => setPicking(false)}
                />
            )}
        </div>
    );
}

