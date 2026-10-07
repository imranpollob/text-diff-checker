/**
 * Diffchecker Application Controller
 * Handles user interactions, split view rendering (word & char diff), theme toggling,
 * diff computation, and the in-diff selection toolbar (Copy, Replace, Delete).
 */

(function () {
  'use strict';

  // DOM Elements
  const originalInput = document.getElementById('originalInput');
  const changedInput = document.getElementById('changedInput');
  const originalStats = document.getElementById('originalStats');
  const changedStats = document.getElementById('changedStats');

  const compareBtn = document.getElementById('compareBtn');
  const swapTextsBtn = document.getElementById('swapTextsBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const copyOriginalBtn = document.getElementById('copyOriginalBtn');
  const copyChangedBtn = document.getElementById('copyChangedBtn');
  const pasteOriginalBtn = document.getElementById('pasteOriginalBtn');
  const pasteChangedBtn = document.getElementById('pasteChangedBtn');
  const clearOriginalBtn = document.getElementById('clearOriginalBtn');
  const clearChangedBtn = document.getElementById('clearChangedBtn');
  const copyOriginalResultBtn = document.getElementById('copyOriginalResultBtn');
  const copyChangedResultBtn = document.getElementById('copyChangedResultBtn');

  const tabButtons = document.querySelectorAll('.tab-btn');
  const optIgnoreWhitespace = document.getElementById('optIgnoreWhitespace');
  const optIgnoreBlankLines = document.getElementById('optIgnoreBlankLines');
  const optIgnoreCase = document.getElementById('optIgnoreCase');
  const optWrapLines = document.getElementById('optWrapLines');

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');

  const resultsHeader = document.getElementById('resultsHeader');
  const statsSummary = document.getElementById('statsSummary');
  const diffCard = document.getElementById('diffCard');
  const emptyState = document.getElementById('emptyState');
  const diffOutput = document.getElementById('diffOutput');
  const toast = document.getElementById('toast');

  // Selection toolbar & replace dialog elements
  const selectionToolbar = document.getElementById('selectionToolbar');
  const selectionCopyBtn = document.getElementById('selectionCopyBtn');
  const selectionReplaceBtn = document.getElementById('selectionReplaceBtn');
  const selectionDeleteBtn = document.getElementById('selectionDeleteBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const replaceDialogTitle = document.getElementById('replaceDialogTitle');
  const replaceDialogMeta = document.getElementById('replaceDialogMeta');
  const replaceDialogInput = document.getElementById('replaceDialogInput');
  const closeReplaceDialogBtn = document.getElementById('closeReplaceDialogBtn');
  const cancelReplaceDialogBtn = document.getElementById('cancelReplaceDialogBtn');
  const confirmReplaceDialogBtn = document.getElementById('confirmReplaceDialogBtn');

  // Caret & caret menu elements
  const diffCaret = document.getElementById('diffCaret');
  const caretMenu = document.getElementById('caretMenu');
  const caretMenuItems = document.getElementById('caretMenuItems');
  const caretInsertBtn = document.getElementById('caretInsertBtn');
  const caretDeleteAboveBtn = document.getElementById('caretDeleteAboveBtn');
  const caretDeleteBelowBtn = document.getElementById('caretDeleteBelowBtn');
  const caretDeleteAboveLabel = document.getElementById('caretDeleteAboveLabel');
  const caretDeleteBelowLabel = document.getElementById('caretDeleteBelowLabel');
  const caretConfirmBox = document.getElementById('caretConfirmBox');
  const caretConfirmText = document.getElementById('caretConfirmText');
  const caretConfirmCancelBtn = document.getElementById('caretConfirmCancelBtn');
  const caretConfirmDeleteBtn = document.getElementById('caretConfirmDeleteBtn');

  // Application State
  let activeMode = 'word'; // 'word' | 'char'
  let cachedDiff = null;
  let pendingSelection = null; // resolved in-diff selection behind the toolbar
  let activeEdit = null; // snapshot being edited in the replace dialog
  let modalMode = null; // 'replace' | 'insert' while the modal is open
  let modalCaret = null; // caret snapshot for insert mode { pane, line, char }
  let pendingCaret = null; // caret behind the caret menu { pane, line, char }
  let caretAnchor = null; // viewport anchor for menu positioning { x, top, bottom }
  let confirmDirection = null; // 'above' | 'below' while the confirm box shows
  let undoSnapshot = null; // { pane, value } for single-level undo of mass deletes
  let toastTimer = null;

  // Sample data designed to showcase Word vs Char diff, Wrap Lines, Blank lines, Whitespace, and Case settings
  const SAMPLE_ORIGINAL = `// Diffchecker Feature Showcase v1.0.0
// This sample demonstrates: Word vs Char diff, Wrap Lines, Blank lines, Whitespace, and Case options.

// 1. TYPO & CHARACTER DIFF (Switch between "Word Diff" and "Char Diff" to see whole-word vs single-letter edits)
const themeConfig = {
  colour: "grey",
  maxRetries: 3,
  apiVersion: "v1.2.0"
};

// 2. WORD-LEVEL & PHRASE MODIFICATIONS (Contiguous additions and removals merged seamlessly)
function processOrder(order, user) {
  // Validate order status
  if (!order || order.status !== "pending") {
    throw new Error("Invalid order status");
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price, 0);
  return { subtotal, status: "processed" };
}

// 3. CASE SENSITIVITY (Toggle "Ignore Case" to hide or show casing differences)
const API_AUTH_HEADER = "BEARER SECRET_TOKEN_123";

// 4. WHITESPACE DIFFERENCES (Toggle "Ignore Whitespace" to ignore extra spacing and indentation)
const   serverTimeout   =   5000;



// 5. BLANK LINES (Toggle "Ignore Blank Lines" to ignore empty spacing lines between code blocks)
// 6. LONG LINE WRAPPING (Toggle "Wrap Lines" to switch between automatic wrapping and horizontal code scrolling)
const documentationNotice = "The billing service processes all transactions through the secure payment gateway, automatically applying local tax rates, seasonal discounts, and sending instant confirmation receipts to the registered customer email address.";
`;

  const SAMPLE_CHANGED = `// Diffchecker Feature Showcase v1.0.1
// This sample demonstrates: Word vs Char diff, Wrap Lines, Blank lines, Whitespace, and Case options.

// 1. TYPO & CHARACTER DIFF (Switch between "Word Diff" and "Char Diff" to see whole-word vs single-letter edits)
const themeConfig = {
  color: "gray",
  maxRetries: 5,
  apiVersion: "v1.2.1"
};

// 2. WORD-LEVEL & PHRASE MODIFICATIONS (Contiguous additions and removals merged seamlessly)
function processOrder(order, user, currency = "USD") {
  // Check and verify customer active status
  if (!order || order.status !== "approved") {
    throw new Error("Unauthorized or unapproved order");
  }

  // Calculate subtotal with quantity and discount
  const subtotal = order.items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  const discount = order.coupon ? subtotal * 0.1 : 0;
  return { subtotal: subtotal - discount, currency, status: "completed" };
}

// 3. CASE SENSITIVITY (Toggle "Ignore Case" to hide or show casing differences)
const API_AUTH_HEADER = "Bearer secret_token_123";

// 4. WHITESPACE DIFFERENCES (Toggle "Ignore Whitespace" to ignore extra spacing and indentation)
const serverTimeout = 5000;

// 5. BLANK LINES (Toggle "Ignore Blank Lines" to ignore empty spacing lines between code blocks)
// 6. LONG LINE WRAPPING (Toggle "Wrap Lines" to switch between automatic wrapping and horizontal code scrolling)
const documentationNotice = "The billing service processes all transactions through the secure payment gateway, automatically applying local tax rates, seasonal discounts, and sending instant confirmation receipts to the registered customer email address.";
`;

  // Initialize
  function init() {
    initTheme();
    bindEvents();
    bindSelectionToolbar();
    bindCaretMenu();
    updateInputStats();
    updateWrapClass();
  }

  // Theme Management
  function initTheme() {
    const savedTheme = localStorage.getItem('diffchecker_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('diffchecker_theme', theme);

    if (theme === 'dark') {
      themeIconSun.style.display = 'block';
      themeIconMoon.style.display = 'none';
    } else {
      themeIconSun.style.display = 'none';
      themeIconMoon.style.display = 'block';
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  // Event Listeners
  function bindEvents() {
    themeToggleBtn.addEventListener('click', toggleTheme);

    originalInput.addEventListener('input', () => {
      updateInputStats();
      invalidateCache();
    });

    changedInput.addEventListener('input', () => {
      updateInputStats();
      invalidateCache();
    });

    compareBtn.addEventListener('click', () => performDiff());

    swapTextsBtn.addEventListener('click', swapTexts);
    sampleBtn.addEventListener('click', loadSample);
    clearAllBtn.addEventListener('click', clearAll);

    clearOriginalBtn.addEventListener('click', () => {
      originalInput.value = '';
      updateInputStats();
      invalidateCache();
      resetDiffView();
    });

    clearChangedBtn.addEventListener('click', () => {
      changedInput.value = '';
      updateInputStats();
      invalidateCache();
      resetDiffView();
    });

    copyOriginalBtn.addEventListener('click', () => copyInputText(originalInput, 'Original'));
    copyChangedBtn.addEventListener('click', () => copyInputText(changedInput, 'Changed'));
    pasteOriginalBtn.addEventListener('click', () => pasteText(originalInput));
    pasteChangedBtn.addEventListener('click', () => pasteText(changedInput));
    copyOriginalResultBtn.addEventListener('click', () => copyInputText(originalInput, 'Original'));
    copyChangedResultBtn.addEventListener('click', () => copyInputText(changedInput, 'Changed'));

    // Mode Switcher Tabs (Word Diff vs Char Diff)
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        switchMode(mode);
      });
    });

    // Options
    optIgnoreWhitespace.addEventListener('change', () => {
      invalidateCache();
      performDiff();
    });

    optIgnoreBlankLines.addEventListener('change', () => {
      invalidateCache();
      performDiff();
    });

    optIgnoreCase.addEventListener('change', () => {
      invalidateCache();
      performDiff();
    });

    optWrapLines.addEventListener('change', () => {
      updateWrapClass();
    });
  }

  // In-diff selection toolbar (Copy / Replace / Delete) + centered replace dialog
  function bindSelectionToolbar() {
    // Evaluate after the user finishes selecting (mouse, keyboard, touch)
    document.addEventListener('mouseup', evaluateDiffSelection);
    document.addEventListener('keyup', evaluateDiffSelection);
    document.addEventListener('touchend', evaluateDiffSelection);

    // Hide as soon as the selection stops being a valid in-diff selection
    document.addEventListener('selectionchange', () => {
      if (isModalOpen()) return;
      if (selectionToolbar.style.display === 'none') return;
      if (!getDiffSelectionInfo()) hideSelectionToolbar();
    });

    // Preserve the document selection while pressing toolbar buttons
    selectionToolbar.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    selectionCopyBtn.addEventListener('click', copyPendingSelection);
    selectionReplaceBtn.addEventListener('click', openReplaceDialog);
    selectionDeleteBtn.addEventListener('click', deletePendingSelection);

    closeReplaceDialogBtn.addEventListener('click', closeModal);
    cancelReplaceDialogBtn.addEventListener('click', closeModal);
    confirmReplaceDialogBtn.addEventListener('click', confirmModal);
    modalOverlay.addEventListener('mousedown', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    replaceDialogInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        confirmModal();
      }
    });

    // Dismiss the toolbar on outside click, Escape, scroll, or resize
    document.addEventListener('mousedown', (e) => {
      const toolbarOpen = selectionToolbar.style.display !== 'none';
      const menuOpen = caretMenu.style.display !== 'none';
      if (!toolbarOpen && !menuOpen) return;
      if (selectionToolbar.contains(e.target) || caretMenu.contains(e.target) || diffOutput.contains(e.target)) return;
      hideSelectionToolbar();
      hideCaretMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (isModalOpen()) {
        closeModal();
      } else if (caretMenu.style.display !== 'none' && confirmDirection) {
        backToCaretItems();
      } else {
        hideSelectionToolbar();
        hideCaretMenu();
      }
    });

    window.addEventListener('scroll', hideSelectionToolbar, { passive: true, capture: true });
    window.addEventListener('resize', hideSelectionToolbar);
    window.addEventListener('scroll', hideCaretMenu, { passive: true, capture: true });
    window.addEventListener('resize', hideCaretMenu);
  }

  function evaluateDiffSelection(e) {
    if (isModalOpen()) return;
    // Events from inside either popup must not re-evaluate: mouseup fires
    // before click, and re-evaluating here would clear the caret snapshot
    // (the selection is collapsed in caret mode) before the click runs.
    if (e && e.target && (caretMenu.contains(e.target) || selectionToolbar.contains(e.target))) return;
    hideCaretMenu(); // caret and selection modes are mutually exclusive
    const info = getDiffSelectionInfo();
    if (!info) {
      hideSelectionToolbar();
      return;
    }
    pendingSelection = info;
    showSelectionToolbar(info.rect);
  }

  // Resolve the current DOM selection to a source-text range, or null when the
  // selection is unusable: collapsed, blank-only, outside the diff, spanning
  // both panes, or touching placeholder rows. Range boundaries may sit in text
  // nodes (drag/keyboard selection) or on elements (triple-click, select-all),
  // and both shapes resolve to the touched source lines.
  function getDiffSelectionInfo() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const text = selection.toString();
    if (!text || text.trim() === '') return null;

    const range = selection.getRangeAt(0);
    let startLineEl = getDiffLineElement(range.startContainer, range.startOffset, false);
    let endLineEl = getDiffLineElement(range.endContainer, range.endOffset, true);

    // Endpoints outside the mapped lines (e.g., triple-click on the last line
    // ends at the next block after the diff) snap to the edge line of the
    // resolved pane — unless the range genuinely spans both panes.
    if (!startLineEl && endLineEl && !rangeTouchesPane(range, otherPaneOf(endLineEl))) {
      startLineEl = edgeLineOfPane(endLineEl.dataset.pane, range.startContainer, range.startOffset, false);
    }
    if (!endLineEl && startLineEl && !rangeTouchesPane(range, otherPaneOf(startLineEl))) {
      endLineEl = edgeLineOfPane(startLineEl.dataset.pane, range.endContainer, range.endOffset, true);
    }
    if (!startLineEl || !endLineEl) return null;

    const startPane = startLineEl.dataset.pane;
    const endPane = endLineEl.dataset.pane;
    if (!startPane || startPane !== endPane) return null;

    const startLine = parseInt(startLineEl.dataset.lineNum, 10);
    const endLine = parseInt(endLineEl.dataset.lineNum, 10);
    if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) return null;

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    return {
      pane: startPane,
      text,
      startLine,
      endLine,
      startChar: getBoundaryOffset(startLineEl, range.startContainer, range.startOffset),
      endChar: getBoundaryOffset(endLineEl, range.endContainer, range.endOffset),
      rect
    };
  }

  // Find the mapped line touched by a range boundary. Text boundaries resolve
  // to their containing line; element boundaries (boundary between child
  // nodes) resolve to the line on the side the range extends toward.
  function getDiffLineElement(node, offset, isEnd) {
    if (!node) return null;
    if (node.nodeType === 3) {
      return lineElementUp(node);
    }
    if (node.nodeType === 1) {
      const kids = node.childNodes;
      const after = offset < kids.length ? kids[offset] : null;
      const before = offset > 0 ? kids[offset - 1] : null;
      const ordered = isEnd ? [before, after] : [after, before];
      for (const candidate of ordered) {
        const lineEl = lineElementFrom(candidate, isEnd);
        if (lineEl) return lineEl;
      }
      return lineElementFrom(node, isEnd);
    }
    return null;
  }

  // Nearest mapped line containing the node, or null (placeholder rows carry
  // no line mapping and cannot be edited).
  function lineElementUp(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el || !diffOutput.contains(el)) return null;
    const lineEl = el.closest('.diff-line-content');
    if (!lineEl || !lineEl.dataset.lineNum || !lineEl.dataset.pane) return null;
    return lineEl;
  }

  // Line touched by a boundary-adjacent node: the containing line, else the
  // edge line inside it (first for a start boundary, last for an end one).
  function lineElementFrom(node, isEnd) {
    if (!node) return null;
    const up = lineElementUp(node);
    if (up) return up;
    if (node.nodeType === 1 && diffOutput.contains(node)) {
      const lines = node.querySelectorAll('.diff-line-content[data-line-num][data-pane]');
      if (lines.length > 0) return lines[isEnd ? lines.length - 1 : 0];
    }
    return null;
  }

  function otherPaneOf(lineEl) {
    return lineEl.dataset.pane === 'original' ? 'changed' : 'original';
  }

  function columnForPane(pane) {
    return document.getElementById(pane === 'original' ? 'splitLeftColumn' : 'splitRightColumn');
  }

  function mappedLinesOf(pane) {
    const col = columnForPane(pane);
    return col ? [...col.querySelectorAll('.diff-line-content[data-line-num][data-pane]')] : [];
  }

  // True when the range intersects any mapped line of the given pane.
  function rangeTouchesPane(range, pane) {
    const lines = mappedLinesOf(pane);
    for (const line of lines) {
      const whole = document.createRange();
      whole.selectNodeContents(line);
      if (range.compareBoundaryPoints(Range.START_TO_END, whole) < 0 &&
          range.compareBoundaryPoints(Range.END_TO_START, whole) > 0) {
        return true;
      }
    }
    return false;
  }

  // Edge line of a pane relative to a boundary point outside the lines: the
  // first line at/after the point for a start boundary, the last line
  // at/before it for an end boundary.
  function edgeLineOfPane(pane, container, offset, isEnd) {
    const lines = mappedLinesOf(pane);
    if (lines.length === 0) return null;
    const point = document.createRange();
    point.setStart(container, offset);
    point.collapse(true);
    if (!isEnd) {
      for (const line of lines) {
        const whole = document.createRange();
        whole.selectNodeContents(line);
        if (point.compareBoundaryPoints(Range.START_TO_END, whole) <= 0) return line;
      }
      return null;
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const whole = document.createRange();
      whole.selectNodeContents(lines[i]);
      if (point.compareBoundaryPoints(Range.START_TO_START, whole) >= 0) return lines[i];
    }
    return null;
  }

  // Character offset of a range boundary within its resolved line. Boundaries
  // inside the line measure directly; boundaries outside it (element edges)
  // snap to the nearer line edge.
  function getBoundaryOffset(lineEl, container, offset) {
    if (lineEl.contains(container)) {
      const preRange = document.createRange();
      preRange.selectNodeContents(lineEl);
      preRange.setEnd(container, offset);
      return preRange.toString().length;
    }
    const point = document.createRange();
    point.setStart(container, offset);
    point.collapse(true);
    const wholeLine = document.createRange();
    wholeLine.selectNodeContents(lineEl);
    return point.compareBoundaryPoints(Range.START_TO_START, wholeLine) < 0
      ? 0
      : lineEl.textContent.length;
  }

  function showSelectionToolbar(rect) {
    selectionToolbar.style.display = 'flex';

    const toolbarRect = selectionToolbar.getBoundingClientRect();
    const width = toolbarRect.width || 220;
    const height = toolbarRect.height || 40;

    let top = rect.top - height - 10;
    let left = rect.left + rect.width / 2 - width / 2;

    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) {
      left = window.innerWidth - width - 8;
    }
    if (top < 8) top = rect.bottom + 10;

    selectionToolbar.style.top = `${top}px`;
    selectionToolbar.style.left = `${left}px`;
  }

  function hideSelectionToolbar() {
    selectionToolbar.style.display = 'none';
    pendingSelection = null;
  }

  function copyPendingSelection() {
    if (!pendingSelection) return;
    const text = pendingSelection.text;
    hideSelectionToolbar();
    copyTextToClipboard(text).then((ok) => {
      showToast(ok ? 'Copied to clipboard' : 'Copy failed — press Ctrl+C to copy');
    });
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text)
        .then(() => true)
        .catch(() => legacyCopyToClipboard(text));
    }
    return Promise.resolve(legacyCopyToClipboard(text));
  }

  function legacyCopyToClipboard(text) {
    try {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.top = '0';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(helper);
      return ok;
    } catch (err) {
      return false;
    }
  }

  function deletePendingSelection() {
    if (!pendingSelection) return;
    const targetInput = pendingSelection.pane === 'original' ? originalInput : changedInput;
    const label = pendingSelection.pane === 'original' ? 'Original' : 'Changed';
    const count = pendingSelection.text.length;

    const result = DiffEngine.applyLineRangeEdit(
      targetInput.value,
      pendingSelection.startLine,
      pendingSelection.endLine,
      pendingSelection.startChar,
      pendingSelection.endChar,
      ''
    );

    if (!result.ok) {
      hideSelectionToolbar();
      showToast('Could not delete — please re-select and try again');
      return;
    }

    targetInput.value = result.text;
    updateInputStats();
    invalidateCache();
    hideSelectionToolbar();
    performDiff();
    showToast(`Deleted ${count} character${count === 1 ? '' : 's'} from ${label}`);
  }

  function isModalOpen() {
    return modalOverlay.style.display !== 'none';
  }

  // Configured modal shell shared by Replace and Insert. Element ids keep
  // their replace-era names; only title, meta, placeholder, confirm label,
  // and the confirm behavior vary per mode.
  function openModal(config) {
    modalMode = config.mode;
    hideSelectionToolbar();
    hideCaretMenu();

    replaceDialogTitle.textContent = config.title;
    replaceDialogMeta.textContent = config.meta;
    replaceDialogInput.value = config.initialText || '';
    replaceDialogInput.placeholder = config.placeholder || '';
    confirmReplaceDialogBtn.textContent = config.confirmLabel;

    modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    replaceDialogInput.focus();
    replaceDialogInput.select();
  }

  function closeModal() {
    modalOverlay.style.display = 'none';
    document.body.style.overflow = '';
    modalMode = null;
    activeEdit = null;
    modalCaret = null;
  }

  function confirmModal() {
    if (modalMode === 'replace') {
      confirmReplace();
    } else if (modalMode === 'insert') {
      confirmInsert();
    } else {
      closeModal();
    }
  }

  function openReplaceDialog() {
    if (!pendingSelection) return;
    activeEdit = pendingSelection;

    const label = activeEdit.pane === 'original' ? 'Original' : 'Changed';
    const linesLabel = activeEdit.startLine === activeEdit.endLine
      ? `Line ${activeEdit.startLine}`
      : `Lines ${activeEdit.startLine}–${activeEdit.endLine}`;
    openModal({
      mode: 'replace',
      title: `Replace in ${label}`,
      meta: `${linesLabel} · ${activeEdit.text.length} characters selected`,
      initialText: activeEdit.text,
      confirmLabel: 'Replace'
    });
  }

  function confirmReplace() {
    if (!activeEdit) {
      closeModal();
      return;
    }
    const targetInput = activeEdit.pane === 'original' ? originalInput : changedInput;
    const label = activeEdit.pane === 'original' ? 'Original' : 'Changed';

    const result = DiffEngine.applyLineRangeEdit(
      targetInput.value,
      activeEdit.startLine,
      activeEdit.endLine,
      activeEdit.startChar,
      activeEdit.endChar,
      replaceDialogInput.value
    );

    if (!result.ok) {
      closeModal();
      showToast('Could not replace — please re-select and try again');
      return;
    }

    targetInput.value = result.text;
    updateInputStats();
    invalidateCache();
    closeModal();
    performDiff();
    showToast(`Replaced in ${label} text`);
  }

  // Click-to-caret + caret action menu (Insert / Delete all above / Delete all below)
  function bindCaretMenu() {
    // A click with a collapsed selection places the caret. Drags either skip
    // click (press/release in different elements) or arrive non-collapsed.
    diffOutput.addEventListener('click', (e) => {
      if (isModalOpen()) return;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) return;
      placeCaretAtPoint(e.clientX, e.clientY);
    });

    caretInsertBtn.addEventListener('click', openInsertDialog);
    caretDeleteAboveBtn.addEventListener('click', () => askDeleteConfirm('above'));
    caretDeleteBelowBtn.addEventListener('click', () => askDeleteConfirm('below'));
    caretConfirmCancelBtn.addEventListener('click', backToCaretItems);
    caretConfirmDeleteBtn.addEventListener('click', executeDeleteAboveBelow);
  }

  function placeCaretAtPoint(x, y) {
    let range = null;
    if (typeof document.caretRangeFromPoint === 'function') {
      try {
        range = document.caretRangeFromPoint(x, y);
      } catch (err) {
        range = null;
      }
    }
    if (!range) {
      hideCaretMenu();
      return;
    }

    const lineEl = getDiffLineElement(range.startContainer, range.startOffset, false);
    if (!lineEl) {
      hideCaretMenu();
      return;
    }

    const pane = lineEl.dataset.pane;
    const line = parseInt(lineEl.dataset.lineNum, 10);
    if (!pane || !Number.isFinite(line)) {
      hideCaretMenu();
      return;
    }

    const targetInput = pane === 'original' ? originalInput : changedInput;
    if (line < 1 || line > targetInput.value.split('\n').length) {
      hideCaretMenu();
      return;
    }

    pendingCaret = {
      pane,
      line,
      char: getBoundaryOffset(lineEl, range.startContainer, range.startOffset)
    };

    const rect = range.getBoundingClientRect();
    if (rect.height === 0) {
      // Resolved to a line but produced no caret geometry (an empty line).
      // Anchor to the line content start so every click there shows one position.
      const lineRect = lineEl.getBoundingClientRect();
      const padLeft = parseFloat(window.getComputedStyle(lineEl).paddingLeft) || 0;
      caretAnchor = { x: lineRect.left + padLeft, top: lineRect.top, bottom: lineRect.bottom };
    } else {
      caretAnchor = { x: rect.left, top: rect.top, bottom: rect.bottom };
    }

    showCaret();
    showCaretMenu();
  }

  function showCaret() {
    diffCaret.style.display = 'block';
    diffCaret.style.left = `${caretAnchor.x - 1}px`;
    diffCaret.style.top = `${caretAnchor.top}px`;
    diffCaret.style.height = `${Math.max(caretAnchor.bottom - caretAnchor.top, 10)}px`;
  }

  function showCaretMenu() {
    if (!pendingCaret) return;
    const targetInput = pendingCaret.pane === 'original' ? originalInput : changedInput;
    const totalLines = targetInput.value.split('\n').length;
    const above = DiffEngine.deleteAboveRange(pendingCaret.line);
    const below = DiffEngine.deleteBelowRange(pendingCaret.line, totalLines);

    if (above) {
      const n = above.endLine - above.startLine + 1;
      caretDeleteAboveLabel.textContent = `Delete ${n} line${n === 1 ? '' : 's'} above`;
      caretDeleteAboveBtn.disabled = false;
    } else {
      caretDeleteAboveLabel.textContent = 'Delete all above';
      caretDeleteAboveBtn.disabled = true;
    }
    if (below) {
      const n = below.endLine - below.startLine + 1;
      caretDeleteBelowLabel.textContent = `Delete ${n} line${n === 1 ? '' : 's'} below`;
      caretDeleteBelowBtn.disabled = false;
    } else {
      caretDeleteBelowLabel.textContent = 'Delete all below';
      caretDeleteBelowBtn.disabled = true;
    }

    backToCaretItems();
    caretMenu.style.display = 'block';
    positionCaretMenu();
  }

  function positionCaretMenu() {
    if (!caretAnchor) return;
    const rect = caretMenu.getBoundingClientRect();
    const width = rect.width || 230;
    const height = rect.height || 140;

    let left = caretAnchor.x + 6;
    let top = caretAnchor.bottom + 6;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    if (top + height > window.innerHeight - 8) top = caretAnchor.top - height - 6;
    if (top < 8) top = 8;

    caretMenu.style.left = `${left}px`;
    caretMenu.style.top = `${top}px`;
  }

  function hideCaretMenu() {
    caretMenu.style.display = 'none';
    diffCaret.style.display = 'none';
    pendingCaret = null;
    caretAnchor = null;
    confirmDirection = null;
  }

  function askDeleteConfirm(direction) {
    if (!pendingCaret) return;
    const targetInput = pendingCaret.pane === 'original' ? originalInput : changedInput;
    const totalLines = targetInput.value.split('\n').length;
    const range = direction === 'above'
      ? DiffEngine.deleteAboveRange(pendingCaret.line)
      : DiffEngine.deleteBelowRange(pendingCaret.line, totalLines);
    if (!range) return; // disabled buttons never reach here; guard anyway

    confirmDirection = direction;
    const n = range.endLine - range.startLine + 1;
    caretConfirmText.textContent = `Delete ${n} line${n === 1 ? '' : 's'} ${direction} line ${pendingCaret.line}?`;
    caretMenuItems.style.display = 'none';
    caretConfirmBox.style.display = 'flex';
    positionCaretMenu();
  }

  function backToCaretItems() {
    confirmDirection = null;
    caretConfirmBox.style.display = 'none';
    caretMenuItems.style.display = 'block';
    if (caretMenu.style.display !== 'none') positionCaretMenu();
  }

  function executeDeleteAboveBelow() {
    if (!pendingCaret || !confirmDirection) {
      hideCaretMenu();
      return;
    }
    const direction = confirmDirection;
    const caret = pendingCaret;
    const targetInput = caret.pane === 'original' ? originalInput : changedInput;
    const label = caret.pane === 'original' ? 'Original' : 'Changed';
    const before = targetInput.value;
    const lines = before.split('\n');

    if (caret.line < 1 || caret.line > lines.length) {
      hideCaretMenu();
      showToast('Could not delete — please click again and retry');
      return;
    }

    let result;
    let count;
    if (direction === 'above') {
      const range = DiffEngine.deleteAboveRange(caret.line);
      if (!range) {
        hideCaretMenu();
        return;
      }
      count = range.endLine - range.startLine + 1;
      // Delete lines 1..cursor-1, keeping the cursor line intact.
      result = DiffEngine.applyLineRangeEdit(before, range.startLine, caret.line, 0, 0, '');
    } else {
      const range = DiffEngine.deleteBelowRange(caret.line, lines.length);
      if (!range) {
        hideCaretMenu();
        return;
      }
      count = range.endLine - range.startLine + 1;
      // Delete lines cursor+1..N, keeping the cursor line intact.
      result = DiffEngine.applyLineRangeEdit(before, caret.line, range.endLine, lines[caret.line - 1].length, lines[range.endLine - 1].length, '');
    }

    if (!result.ok) {
      hideCaretMenu();
      showToast('Could not delete — please click again and retry');
      return;
    }

    targetInput.value = result.text;
    updateInputStats();
    invalidateCache();
    hideCaretMenu();
    performDiff();
    showUndoToast(`Deleted ${count} line${count === 1 ? '' : 's'} ${direction} line ${caret.line} in ${label}`, { pane: caret.pane, value: before });
  }

  function openInsertDialog() {
    if (!pendingCaret) return;
    modalCaret = pendingCaret;

    const label = modalCaret.pane === 'original' ? 'Original' : 'Changed';
    openModal({
      mode: 'insert',
      title: `Insert in ${label}`,
      meta: `Line ${modalCaret.line} · Position ${modalCaret.char + 1}`,
      initialText: '',
      placeholder: 'Type text to insert…',
      confirmLabel: 'Insert'
    });
  }

  function confirmInsert() {
    if (!modalCaret) {
      closeModal();
      return;
    }
    const targetInput = modalCaret.pane === 'original' ? originalInput : changedInput;
    const label = modalCaret.pane === 'original' ? 'Original' : 'Changed';
    const text = replaceDialogInput.value;

    if (!text) {
      closeModal();
      return;
    }

    const result = DiffEngine.applyLineRangeEdit(
      targetInput.value,
      modalCaret.line,
      modalCaret.line,
      modalCaret.char,
      modalCaret.char,
      text
    );

    if (!result.ok) {
      closeModal();
      showToast('Could not insert — please click again and retry');
      return;
    }

    targetInput.value = result.text;
    updateInputStats();
    invalidateCache();
    closeModal();
    performDiff();
    showToast(`Inserted ${text.length} character${text.length === 1 ? '' : 's'} in ${label}`);
  }

  function updateInputStats() {
    const origText = originalInput.value;
    const chgText = changedInput.value;

    const origLines = origText ? origText.split('\n').length : 0;
    const chgLines = chgText ? chgText.split('\n').length : 0;

    originalStats.textContent = `${origLines} ${origLines === 1 ? 'line' : 'lines'}, ${origText.length} chars`;
    changedStats.textContent = `${chgLines} ${chgLines === 1 ? 'line' : 'lines'}, ${chgText.length} chars`;
  }

  function invalidateCache() {
    cachedDiff = null;
  }

  function resetDiffView() {
    emptyState.style.display = 'flex';
    diffOutput.style.display = 'none';
    resultsHeader.style.display = 'none';
    diffOutput.innerHTML = '';
    hideSelectionToolbar();
    hideCaretMenu();
  }

  function switchMode(mode) {
    activeMode = mode;
    tabButtons.forEach(btn => {
      const isSelected = btn.getAttribute('data-mode') === mode;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', isSelected);
    });

    if (cachedDiff || (originalInput.value || changedInput.value)) {
      renderActiveView();
    }
  }

  function updateWrapClass() {
    if (optWrapLines.checked) {
      diffOutput.classList.add('wrap-lines');
      originalInput.style.whiteSpace = 'pre-wrap';
      changedInput.style.whiteSpace = 'pre-wrap';
    } else {
      diffOutput.classList.remove('wrap-lines');
      originalInput.style.whiteSpace = 'pre';
      changedInput.style.whiteSpace = 'pre';
    }
  }

  function copyInputText(targetInput, label) {
    const text = targetInput.value;
    if (!text) {
      showToast(`${label} text is empty`);
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => showToast(`Copied ${label} text to clipboard`))
      .catch(() => showToast('Failed to copy text'));
  }

  async function pasteText(targetTextarea) {
    try {
      const text = await navigator.clipboard.readText();
      targetTextarea.value = text;
      updateInputStats();
      invalidateCache();
      showToast('Pasted from clipboard');
    } catch (err) {
      targetTextarea.focus();
      showToast('Press Ctrl+V to paste');
    }
  }

  function swapTexts() {
    const temp = originalInput.value;
    originalInput.value = changedInput.value;
    changedInput.value = temp;

    updateInputStats();
    invalidateCache();

    if (originalInput.value || changedInput.value) {
      performDiff();
      showToast('Texts swapped');
    }
  }

  function loadSample() {
    originalInput.value = SAMPLE_ORIGINAL;
    changedInput.value = SAMPLE_CHANGED;
    updateInputStats();
    invalidateCache();
    performDiff();
    showToast('Loaded sample text');
  }

  function clearAll() {
    originalInput.value = '';
    changedInput.value = '';
    updateInputStats();
    invalidateCache();
    resetDiffView();
    showToast('Cleared all inputs');
  }

  function showToast(message) {
    undoSnapshot = null;
    if (toastTimer) clearTimeout(toastTimer);
    toast.classList.remove('toast-actionable');
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  function showUndoToast(message, snapshot) {
    undoSnapshot = snapshot;
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = '';
    toast.classList.add('toast-actionable');
    const label = document.createElement('span');
    label.textContent = message;
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', undoLastDestructiveEdit);
    toast.appendChild(label);
    toast.appendChild(document.createTextNode(' '));
    toast.appendChild(undoBtn);
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.remove('toast-actionable');
      undoSnapshot = null;
    }, 6000);
  }

  function undoLastDestructiveEdit() {
    if (!undoSnapshot) return;
    const targetInput = undoSnapshot.pane === 'original' ? originalInput : changedInput;
    targetInput.value = undoSnapshot.value;
    undoSnapshot = null;
    if (toastTimer) clearTimeout(toastTimer);
    toast.classList.remove('show');
    toast.classList.remove('toast-actionable');
    updateInputStats();
    invalidateCache();
    performDiff();
    showToast('Undone');
  }

  function getOptions() {
    return {
      ignoreWhitespace: optIgnoreWhitespace.checked,
      ignoreBlankLines: optIgnoreBlankLines.checked,
      ignoreCase: optIgnoreCase.checked,
      diffMode: activeMode
    };
  }

  // Perform Diff Computation
  function performDiff() {
    hideSelectionToolbar();
    hideCaretMenu(); // rendered nodes (and any resolved range) are about to be replaced
    const textA = originalInput.value;
    const textB = changedInput.value;

    if (!textA && !textB) {
      resetDiffView();
      return;
    }

    const options = getOptions();

    // Compute line diff
    const rawLineEdits = DiffEngine.computeLineDiff(textA, textB, options);
    const stats = DiffEngine.computeStats(rawLineEdits);

    cachedDiff = {
      textA,
      textB,
      options,
      rawLineEdits,
      stats
    };

    renderActiveView();
  }

  function renderActiveView() {
    hideSelectionToolbar();
    hideCaretMenu(); // rendered nodes (and any resolved range) are about to be replaced
    if (!cachedDiff) {
      performDiff();
      return;
    }

    const { options, rawLineEdits, stats } = cachedDiff;
    options.diffMode = activeMode;

    emptyState.style.display = 'none';
    diffOutput.style.display = 'block';
    resultsHeader.style.display = 'flex';
    updateWrapClass();

    renderStatsSummary(stats);

    if (stats.isIdentical) {
      diffOutput.innerHTML = `
        <div class="identical-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Texts are identical — no differences found.</span>
        </div>
      `;
      return;
    }

    renderSplitView(rawLineEdits, options);
  }

  function renderStatsSummary(stats) {
    if (stats.isIdentical) {
      statsSummary.innerHTML = `<span class="stat-pill stat-pill-equal">0 changes</span>`;
      return;
    }

    statsSummary.innerHTML = `
      <span class="stat-pill stat-pill-add">+${stats.additions} addition${stats.additions === 1 ? '' : 's'}</span>
      <span class="stat-pill stat-pill-del">-${stats.deletions} deletion${stats.deletions === 1 ? '' : 's'}</span>
      <span class="stat-pill stat-pill-equal">${stats.unchanged} unchanged</span>
    `;
  }

  // Render Split (Side-by-Side) View with intra-line word/char diffing.
  // Content lines carry data-pane/data-line-num so in-diff selections map to source lines.
  function renderSplitView(rawLineEdits, options) {
    const alignedRows = DiffEngine.alignSplitDiff(rawLineEdits, options);

    let leftRowsHtml = '';
    let rightRowsHtml = '';

    for (let i = 0; i < alignedRows.length; i++) {
      const row = alignedRows[i];

      // Left Column (Original)
      if (row.left) {
        const rowClass = row.left.type === 'del' ? 'diff-row-del' : 'diff-row-equal';
        leftRowsHtml += `
          <div class="diff-row ${rowClass}">
            <div class="diff-gutter">${row.left.lineNum}</div>
            <div class="diff-line-content" data-pane="original" data-line-num="${row.left.lineNum}">${row.left.html}</div>
          </div>
        `;
      } else {
        leftRowsHtml += `
          <div class="diff-row diff-row-empty">
            <div class="diff-gutter">&nbsp;</div>
            <div class="diff-line-content">&nbsp;</div>
          </div>
        `;
      }

      // Right Column (Changed)
      if (row.right) {
        const rowClass = row.right.type === 'add' ? 'diff-row-add' : 'diff-row-equal';
        rightRowsHtml += `
          <div class="diff-row ${rowClass}">
            <div class="diff-gutter">${row.right.lineNum}</div>
            <div class="diff-line-content" data-pane="changed" data-line-num="${row.right.lineNum}">${row.right.html}</div>
          </div>
        `;
      } else {
        rightRowsHtml += `
          <div class="diff-row diff-row-empty">
            <div class="diff-gutter">&nbsp;</div>
            <div class="diff-line-content">&nbsp;</div>
          </div>
        `;
      }
    }

    diffOutput.innerHTML = `
      <div class="diff-split-container">
        <div class="split-column" id="splitLeftColumn">
          <div class="split-column-header">Original</div>
          <div class="diff-table">${leftRowsHtml}</div>
        </div>
        <div class="split-column" id="splitRightColumn">
          <div class="split-column-header">Changed</div>
          <div class="diff-table">${rightRowsHtml}</div>
        </div>
      </div>
    `;

    // Synchronize horizontal & vertical scrolling
    setupSynchronizedScroll();
  }

  function setupSynchronizedScroll() {
    const leftCol = document.getElementById('splitLeftColumn');
    const rightCol = document.getElementById('splitRightColumn');
    if (!leftCol || !rightCol) return;

    let isSyncingLeft = false;
    let isSyncingRight = false;

    leftCol.addEventListener('scroll', () => {
      if (!isSyncingLeft) {
        isSyncingRight = true;
        rightCol.scrollTop = leftCol.scrollTop;
        rightCol.scrollLeft = leftCol.scrollLeft;
      }
      isSyncingLeft = false;
    });

    rightCol.addEventListener('scroll', () => {
      if (!isSyncingRight) {
        isSyncingLeft = true;
        leftCol.scrollTop = rightCol.scrollTop;
        leftCol.scrollLeft = rightCol.scrollLeft;
      }
      isSyncingRight = false;
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
