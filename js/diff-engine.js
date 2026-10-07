/**
 * Pure standalone diff engine implementing the Myers Diff Algorithm.
 * Supports line-by-line diff with intra-line word-level and character-level
 * difference highlighting in split side-by-side view, with support for
 * ignoring whitespace, case, and blank lines.
 */

(function (global) {
  'use strict';

  const DiffEngine = {};

  /**
   * Escape HTML special characters.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  DiffEngine.escapeHtml = escapeHtml;

  /**
   * Tokenizers
   */
  function isBlankLine(line) {
    return line.trim() === '';
  }

  function tokenizeLines(text, options = {}) {
    if (text === '') return [];
    // Normalize newlines and split into lines
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let lines = normalized.split('\n');
    if (options.ignoreBlankLines) {
      lines = lines.filter(line => !isBlankLine(line));
    }
    return lines;
  }

  /**
   * Map each position of the blank-filtered line array back to its 0-based
   * index in the original text, so rendered rows can resolve exact source
   * lines even when blank lines are ignored. Must mirror tokenizeLines.
   */
  function sourceLineIndexMap(text) {
    if (text === '') return [];
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    const map = [];
    for (let i = 0; i < lines.length; i++) {
      if (!isBlankLine(lines[i])) map.push(i);
    }
    return map;
  }

  DiffEngine.sourceLineIndexMap = sourceLineIndexMap;

  function tokenizeWords(text) {
    if (!text) return [];
    // Tokenize keeping words, whitespace, and punctuation distinct
    const matches = text.match(/[\w\u00C0-\u024F]+|[^\w\s\u00C0-\u024F]+|\s+/g);
    return matches || [];
  }

  function tokenizeChars(text) {
    if (!text) return [];
    return Array.from(text);
  }

  DiffEngine.tokenizeLines = tokenizeLines;
  DiffEngine.tokenizeWords = tokenizeWords;
  DiffEngine.tokenizeChars = tokenizeChars;

  /**
   * Core Myers Diff Algorithm
   * Finds the Shortest Edit Script (SES) between array A and array B.
   *
   * @param {Array} a - Original array of items
   * @param {Array} b - Changed array of items
   * @param {Object} options - { ignoreCase, ignoreWhitespace, ignoreBlankLines }
   * @param {Function} [customCompare] - Optional custom equality function
   * @returns {Array} Array of edit operations { type: 'equal'|'add'|'del', value: item, indexA, indexB }
   */
  function myersDiff(a, b, options = {}, customCompare = null) {
    const n = a.length;
    const m = b.length;

    // Fast paths
    if (n === 0 && m === 0) return [];
    if (n === 0) return b.map((val, idx) => ({ type: 'add', value: val, indexB: idx }));
    if (m === 0) return a.map((val, idx) => ({ type: 'del', value: val, indexA: idx }));

    const compare = customCompare || function (itemA, itemB) {
      let strA = itemA;
      let strB = itemB;

      if (options.ignoreCase) {
        strA = strA.toLowerCase();
        strB = strB.toLowerCase();
      }

      if (options.ignoreWhitespace) {
        strA = strA.replace(/\s+/g, ' ').trim();
        strB = strB.replace(/\s+/g, ' ').trim();
      }

      return strA === strB;
    };

    const max = n + m;
    const vOffset = max;
    const v = new Int32Array(2 * max + 1);
    v.fill(-1);
    v[1 + vOffset] = 0;

    const trace = [];

    for (let d = 0; d <= max; d++) {
      const vCopy = new Int32Array(v);
      trace.push(vCopy);

      for (let k = -d; k <= d; k += 2) {
        let x;
        if (k === -d || (k !== d && v[k - 1 + vOffset] < v[k + 1 + vOffset])) {
          x = v[k + 1 + vOffset];
        } else {
          x = v[k - 1 + vOffset] + 1;
        }

        let y = x - k;

        while (x < n && y < m && compare(a[x], b[y])) {
          x++;
          y++;
        }

        v[k + vOffset] = x;

        if (x >= n && y >= m) {
          return backtrack(trace, a, b, vOffset);
        }
      }
    }

    return [];
  }

  function backtrack(trace, a, b, vOffset) {
    let x = a.length;
    let y = b.length;
    const edits = [];

    for (let d = trace.length - 1; d >= 0; d--) {
      const v = trace[d];
      const k = x - y;

      let prevK;
      if (k === -d || (k !== d && v[k - 1 + vOffset] < v[k + 1 + vOffset])) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }

      const prevX = v[prevK + vOffset];
      const prevY = prevX - prevK;

      while (x > prevX && y > prevY) {
        x--;
        y--;
        edits.unshift({ type: 'equal', value: a[x], originalValue: a[x], changedValue: b[y], indexA: x, indexB: y });
      }

      if (d > 0) {
        if (x === prevX) {
          y--;
          edits.unshift({ type: 'add', value: b[y], indexB: y });
        } else if (y === prevY) {
          x--;
          edits.unshift({ type: 'del', value: a[x], indexA: x });
        }
      }
    }

    return edits;
  }

  DiffEngine.myersDiff = myersDiff;

  /**
   * Word-level diff.
   */
  function computeWordDiff(textA, textB, options = {}) {
    const wordsA = tokenizeWords(textA);
    const wordsB = tokenizeWords(textB);
    return myersDiff(wordsA, wordsB, options);
  }

  DiffEngine.computeWordDiff = computeWordDiff;

  /**
   * Character-level diff.
   */
  function computeCharDiff(textA, textB, options = {}) {
    const charsA = tokenizeChars(textA);
    const charsB = tokenizeChars(textB);
    return myersDiff(charsA, charsB, options);
  }

  DiffEngine.computeCharDiff = computeCharDiff;

  /**
   * Helper to merge consecutive edits of the same type into single contiguous blocks.
   */
  function mergeConsecutiveEdits(edits) {
    if (!edits || edits.length === 0) return [];
    const merged = [];
    let current = null;

    for (const edit of edits) {
      if (!current) {
        current = { type: edit.type, value: edit.value };
      } else if (current.type === edit.type) {
        current.value += edit.value;
      } else {
        merged.push(current);
        current = { type: edit.type, value: edit.value };
      }
    }

    if (current) {
      merged.push(current);
    }

    return merged;
  }

  DiffEngine.mergeConsecutiveEdits = mergeConsecutiveEdits;

  /**
   * Builds highlighted HTML for a line by extracting tokens for that line,
   * absorbing whitespace between adjacent modifications, and merging into
   * seamless contiguous highlight blocks.
   *
   * @param {Array} edits - The raw Myers diff edit tokens
   * @param {string} targetType - 'del' for left line, 'add' for right line
   * @returns {string} Escaped HTML with unified highlight spans
   */
  function buildLineHighlightHtml(edits, targetType) {
    // 1. Extract tokens that belong to this side (either 'equal' or targetType)
    const lineTokens = [];
    for (const edit of edits) {
      if (edit.type === 'equal' || edit.type === targetType) {
        lineTokens.push({
          type: edit.type,
          value: edit.value
        });
      }
    }

    // 2. Absorb whitespace sandwiched between two modifications of targetType
    for (let i = 1; i < lineTokens.length - 1; i++) {
      if (
        lineTokens[i].type === 'equal' &&
        /^\s+$/.test(lineTokens[i].value) &&
        lineTokens[i - 1].type === targetType &&
        lineTokens[i + 1].type === targetType
      ) {
        lineTokens[i].type = targetType;
      }
    }

    // 3. Merge consecutive tokens of the same type
    const merged = mergeConsecutiveEdits(lineTokens);

    // 4. Generate HTML
    let html = '';
    const spanClass = targetType === 'del' ? 'diff-token-del' : 'diff-token-add';

    for (const token of merged) {
      const escaped = escapeHtml(token.value);
      if (token.type === targetType) {
        html += `<span class="${spanClass}">${escaped}</span>`;
      } else {
        html += escaped;
      }
    }

    return html;
  }

  DiffEngine.buildLineHighlightHtml = buildLineHighlightHtml;

  /**
   * Intra-line diffing for modified line pairs (word-level or char-level).
   * Produces highlighted HTML for left (del) and right (add) lines,
   * merging contiguous words and spaces into seamless highlighted blocks.
   */
  function computeIntraLineDiff(delLine, addLine, options = {}) {
    if (delLine === null || addLine === null) {
      return {
        delHtml: delLine !== null ? escapeHtml(delLine) : '',
        addHtml: addLine !== null ? escapeHtml(addLine) : ''
      };
    }

    const mode = options.diffMode === 'char' ? 'char' : 'word';
    const rawEdits = mode === 'char'
      ? computeCharDiff(delLine, addLine, options)
      : computeWordDiff(delLine, addLine, options);

    const delHtml = buildLineHighlightHtml(rawEdits, 'del');
    const addHtml = buildLineHighlightHtml(rawEdits, 'add');

    return { delHtml, addHtml };
  }

  DiffEngine.computeIntraLineDiff = computeIntraLineDiff;

  /**
   * Compute line-level diff with Myers algorithm.
   */
  function computeLineDiff(textA, textB, options = {}) {
    const linesA = tokenizeLines(textA, options);
    const linesB = tokenizeLines(textB, options);
    const edits = myersDiff(linesA, linesB, options);

    // Annotate every edit with 0-based source line indices so rendered rows
    // map back to exact input lines even when blank lines are filtered out.
    const mapA = options.ignoreBlankLines ? sourceLineIndexMap(textA) : null;
    const mapB = options.ignoreBlankLines ? sourceLineIndexMap(textB) : null;
    for (const edit of edits) {
      if (typeof edit.indexA === 'number') {
        edit.srcIndexA = mapA ? mapA[edit.indexA] : edit.indexA;
      }
      if (typeof edit.indexB === 'number') {
        edit.srcIndexB = mapB ? mapB[edit.indexB] : edit.indexB;
      }
    }
    return edits;
  }

  DiffEngine.computeLineDiff = computeLineDiff;

  /**
   * Resolve the 1-based source line number for an edit side. Prefers the
   * annotated source index (exact even when blank lines are filtered) and
   * falls back to the running counter for unannotated edits.
   */
  function sourceLineNum(edit, key, fallback) {
    const idx = edit ? edit[key] : undefined;
    return typeof idx === 'number' ? idx + 1 : fallback;
  }

  /**
   * Align line diff into Side-by-Side (Split) structure with intra-line word/char highlights.
   *
   * @param {Array} rawEdits - Raw edit operations from computeLineDiff
   * @param {Object} options - { ignoreCase, ignoreWhitespace, ignoreBlankLines, diffMode }
   * @returns {Array} Array of row pairs { left: LineInfo|null, right: LineInfo|null }
   */
  function alignSplitDiff(rawEdits, options = {}) {
    const rows = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    let i = 0;
    while (i < rawEdits.length) {
      const edit = rawEdits[i];

      if (edit.type === 'equal') {
        const leftNum = sourceLineNum(edit, 'srcIndexA', oldLineNum);
        const rightNum = sourceLineNum(edit, 'srcIndexB', newLineNum);
        oldLineNum = leftNum + 1;
        newLineNum = rightNum + 1;
        rows.push({
          type: 'equal',
          left: {
            lineNum: leftNum,
            content: edit.originalValue,
            html: escapeHtml(edit.originalValue),
            type: 'equal'
          },
          right: {
            lineNum: rightNum,
            content: edit.changedValue,
            html: escapeHtml(edit.changedValue),
            type: 'equal'
          }
        });
        i++;
      } else {
        // Collect consecutive deletes and adds
        const delBlock = [];
        const addBlock = [];

        while (i < rawEdits.length && rawEdits[i].type !== 'equal') {
          if (rawEdits[i].type === 'del') {
            delBlock.push(rawEdits[i]);
          } else if (rawEdits[i].type === 'add') {
            addBlock.push(rawEdits[i]);
          }
          i++;
        }

        const maxCount = Math.max(delBlock.length, addBlock.length);
        for (let j = 0; j < maxCount; j++) {
          const hasDel = j < delBlock.length;
          const hasAdd = j < addBlock.length;

          let leftInfo = null;
          let rightInfo = null;
          let rowType = 'modified';

          if (hasDel && hasAdd) {
            // Paired modification -> compute intra-line word/char highlights
            const delVal = delBlock[j].value;
            const addVal = addBlock[j].value;
            const intra = computeIntraLineDiff(delVal, addVal, options);

            const leftNum = sourceLineNum(delBlock[j], 'srcIndexA', oldLineNum);
            const rightNum = sourceLineNum(addBlock[j], 'srcIndexB', newLineNum);
            oldLineNum = leftNum + 1;
            newLineNum = rightNum + 1;

            leftInfo = {
              lineNum: leftNum,
              content: delVal,
              html: intra.delHtml,
              type: 'del',
              isModified: true
            };
            rightInfo = {
              lineNum: rightNum,
              content: addVal,
              html: intra.addHtml,
              type: 'add',
              isModified: true
            };
            rowType = 'modified';
          } else if (hasDel) {
            const delVal = delBlock[j].value;
            const leftNum = sourceLineNum(delBlock[j], 'srcIndexA', oldLineNum);
            oldLineNum = leftNum + 1;
            leftInfo = {
              lineNum: leftNum,
              content: delVal,
              html: escapeHtml(delVal),
              type: 'del',
              isModified: false
            };
            rightInfo = null;
            rowType = 'del';
          } else if (hasAdd) {
            const addVal = addBlock[j].value;
            const rightNum = sourceLineNum(addBlock[j], 'srcIndexB', newLineNum);
            newLineNum = rightNum + 1;
            leftInfo = null;
            rightInfo = {
              lineNum: rightNum,
              content: addVal,
              html: escapeHtml(addVal),
              type: 'add',
              isModified: false
            };
            rowType = 'add';
          }

          rows.push({
            type: rowType,
            left: leftInfo,
            right: rightInfo
          });
        }
      }
    }

    return rows;
  }

  DiffEngine.alignSplitDiff = alignSplitDiff;

  /**
   * Compute overall statistics of the diff.
   */
  function computeStats(rawEdits) {
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (const edit of rawEdits) {
      if (edit.type === 'add') additions++;
      else if (edit.type === 'del') deletions++;
      else if (edit.type === 'equal') unchanged++;
    }

    return {
      additions,
      deletions,
      unchanged,
      totalChanges: additions + deletions,
      isIdentical: additions === 0 && deletions === 0
    };
  }

  DiffEngine.computeStats = computeStats;

  /**
   * Apply a line-range replacement to text (pure, bounds-checked).
   *
   * @param {string} text - Full original text ('\n'-separated lines)
   * @param {number} startLine - 1-based start line
   * @param {number} endLine - 1-based end line (must be >= startLine)
   * @param {number} startChar - UTF-16 offset within the start line
   * @param {number} endChar - UTF-16 offset within the end line
   * @param {string} replacement - Replacement text (may contain newlines; '' deletes)
   * @returns {{ text: string, ok: boolean }} New text, or ok:false with the
   *          original text when the line range is invalid. Character offsets
   *          are clamped to their line lengths.
   */
  function applyLineRangeEdit(text, startLine, endLine, startChar, endChar, replacement) {
    const original = text === undefined || text === null ? '' : String(text);
    const lines = original.split('\n');
    const s = Math.floor(startLine);
    const e = Math.floor(endLine);

    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 1 || e < s || e > lines.length) {
      return { text: original, ok: false };
    }

    const clampChar = (value, len) => {
      const n = Number.isFinite(value) ? Math.floor(value) : 0;
      return Math.max(0, Math.min(n, len));
    };
    const rep = replacement === undefined || replacement === null ? '' : String(replacement);
    const startIdx = s - 1;
    const endIdx = e - 1;

    if (startIdx === endIdx) {
      const sc = clampChar(startChar, lines[startIdx].length);
      const ec = Math.max(clampChar(endChar, lines[startIdx].length), sc);
      lines[startIdx] = lines[startIdx].slice(0, sc) + rep + lines[startIdx].slice(ec);
    } else {
      const before = lines[startIdx].slice(0, clampChar(startChar, lines[startIdx].length));
      const after = lines[endIdx].slice(clampChar(endChar, lines[endIdx].length));
      const combined = before + rep + after;
      lines.splice(startIdx, endIdx - startIdx + 1, ...combined.split('\n'));
    }

    return { text: lines.join('\n'), ok: true };
  }

  DiffEngine.applyLineRangeEdit = applyLineRangeEdit;

  // Export to global / window or module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiffEngine;
  } else {
    global.DiffEngine = DiffEngine;
  }

})(typeof window !== 'undefined' ? window : this);
