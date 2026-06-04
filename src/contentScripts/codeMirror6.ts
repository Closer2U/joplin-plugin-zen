import { Compartment } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

const winkNLP = require('wink-nlp');
const winkModel = require('wink-eng-lite-web-model');

type Platform = 'desktop' | 'mobile';
type SyntaxKind = 'adjective' | 'noun' | 'adverb' | 'verb' | 'conjunction';
type StyleKind = 'fillers' | 'cliches' | 'redundancies' | 'weak' | 'custom' | 'repetition';
type MatchKind = SyntaxKind | StyleKind;

type ZenSettings = {
  enabled: boolean;
  analysisEnabled: boolean;
  inactiveOpacity: number;
  contentWidthEm: number;
  centerCursor: boolean;
  focusUnit: number;
  fontFamily: string;
  fontSizePx: number;
  centerOffsetVh: number;
  textColor: string;
  backgroundColor: string;
  platform: Platform;
  syntaxHighlightEnabled: boolean;
  syntaxHighlightAdjectives: boolean;
  syntaxHighlightNouns: boolean;
  syntaxHighlightAdverbs: boolean;
  syntaxHighlightVerbs: boolean;
  syntaxHighlightConjunctions: boolean;
  syntaxStyleMode: number;
  syntaxColorAdjective: string;
  syntaxColorNoun: string;
  syntaxColorAdverb: string;
  syntaxColorVerb: string;
  syntaxColorConjunction: string;
  styleCheckEnabled: boolean;
  styleCheckFillers: boolean;
  styleCheckCliches: boolean;
  styleCheckRedundancies: boolean;
  styleCheckWeakPhrases: boolean;
  styleCheckRepetitions: boolean;
  styleCheckStyleMode: number;
  styleCheckColorFillers: string;
  styleCheckColorCliches: string;
  styleCheckColorRedundancies: string;
  styleCheckColorWeak: string;
  styleCheckColorCustom: string;
  styleCheckColorRepetitions: string;
  styleCheckTooltipsEnabled: boolean;
  styleCheckLegendEnabled: boolean;
  analysisScope: number;
  styleCheckExtraFillers: string;
  styleCheckExtraCliches: string;
  styleCheckExtraRedundancies: string;
  styleCheckExtraWeakPhrases: string;
  styleCheckCustomPatterns: string;
};

type ContentScriptContext = {
  contentScriptId: string;
  postMessage: (message: unknown) => Promise<unknown>;
};

type RuleDef = {
  kind: Exclude<StyleKind, 'custom' | 'repetition'>;
  regex: RegExp;
};

type MarkMatch = {
  from: number;
  to: number;
  kind: MatchKind;
  title?: string;
};

type Token = {
  word: string;
  lower: string;
  from: number;
  to: number;
  prevLower: string;
  prev2Lower: string;
  nextLower: string;
  next2Lower: string;
  lemma?: string;
  posTag?: string;
};

const defaultSettings: ZenSettings = {
  enabled: false,
  analysisEnabled: true,
  inactiveOpacity: 35,
  contentWidthEm: 46,
  centerCursor: true,
  focusUnit: 1,
  fontFamily: '',
  fontSizePx: 0,
  centerOffsetVh: 0,
  textColor: '',
  backgroundColor: '',
  platform: 'desktop',
  syntaxHighlightEnabled: true,
  syntaxHighlightAdjectives: true,
  syntaxHighlightNouns: true,
  syntaxHighlightAdverbs: true,
  syntaxHighlightVerbs: true,
  syntaxHighlightConjunctions: true,
  syntaxStyleMode: 1,
  syntaxColorAdjective: '#a87a3b',
  syntaxColorNoun: '#cf5c57',
  syntaxColorAdverb: '#8c63d9',
  syntaxColorVerb: '#4b86d9',
  syntaxColorConjunction: '#49a66a',
  styleCheckEnabled: false,
  styleCheckFillers: true,
  styleCheckCliches: true,
  styleCheckRedundancies: true,
  styleCheckWeakPhrases: true,
  styleCheckRepetitions: true,
  styleCheckStyleMode: 1,
  styleCheckColorFillers: '#e9b552',
  styleCheckColorCliches: '#e76262',
  styleCheckColorRedundancies: '#e79662',
  styleCheckColorWeak: '#6eaaf0',
  styleCheckColorCustom: '#6eaaf0',
  styleCheckColorRepetitions: '#d96ee0',
  styleCheckTooltipsEnabled: true,
  styleCheckLegendEnabled: true,
  analysisScope: 1,
  styleCheckExtraFillers: '',
  styleCheckExtraCliches: '',
  styleCheckExtraRedundancies: '',
  styleCheckExtraWeakPhrases: '',
  styleCheckCustomPatterns: '',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRegex = (phrase: string) => new RegExp(`\\b${escapeRegex(phrase).replace(/\s+/g, '\\s+')}\\b`, 'gi');
const wordRegex = /[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'-]*/g;

const desktopFillers = [
  'actually', 'basically', 'clearly', 'definitely', 'generally', 'just', 'kind of', 'literally', 'maybe', 'perhaps',
  'pretty much', 'quite', 'rather', 'really', 'simply', 'sort of', 'totally', 'very', 'virtually',
];
const mobileFillers = ['actually', 'basically', 'just', 'kind of', 'really', 'sort of', 'very', 'quite', 'rather'];
const desktopCliches = [
  'against all odds', 'at the end of the day', 'avoid it like the plague', 'back to square one', 'brass tacks', 'calm before the storm',
  'down the drain', 'easy as pie', 'in this day and age', 'last but not least', 'light at the end of the tunnel', 'long and short of it',
  'needle in a haystack', 'on the same page', 'think outside the box', 'tip of the iceberg',
];
const mobileCliches = ['at the end of the day', 'down the drain', 'on the same page', 'think outside the box', 'tip of the iceberg'];
const desktopRedundancies = [
  'advance planning', 'advance warning', 'basic fundamentals', 'close proximity', 'combine together', 'completely finished', 'each and every',
  'end result', 'fall down', 'final outcome', 'future plans', 'join together', 'merge together', 'past history', 'personal opinion', 'repeat again',
  'return back', 'unexpected surprise',
];
const mobileRedundancies = ['basic fundamentals', 'combine together', 'end result', 'past history', 'personal opinion', 'return back'];
const desktopWeakPhrases = ['is able to', 'is due to', 'is going to', 'it seems', 'there is', 'there are', 'was able to', 'were able to'];
const mobileWeakPhrases = ['there is', 'there are', 'is going to'];

const desktopConjunctions = new Set(['and', 'because', 'but', 'for', 'if', 'nor', 'once', 'or', 'since', 'so', 'though', 'unless', 'until', 'when', 'whereas', 'while', 'yet', 'although']);
const mobileConjunctions = new Set(['and', 'but', 'or', 'because', 'if', 'so', 'while', 'although']);
const determiners = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'each', 'every', 'some', 'many', 'few']);
const pronouns = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'someone', 'somebody', 'everyone', 'everybody', 'nobody', 'who']);
const intensifiers = new Set(['very', 'really', 'quite', 'rather', 'too', 'so', 'more', 'most', 'less']);
const auxiliaries = new Set(['am', 'are', 'be', 'been', 'being', 'can', 'could', 'did', 'do', 'does', 'had', 'has', 'have', 'is', 'may', 'might', 'must', 'shall', 'should', 'was', 'were', 'will', 'would']);
const gerundPrepositions = new Set(['after', 'before', 'by', 'for', 'from', 'in', 'into', 'on', 'onto', 'through', 'while', 'without']);
const commonVerbsToIgnoreForRepetition = new Set(['am', 'are', 'be', 'been', 'being', 'do', 'does', 'did', 'get', 'go', 'have', 'has', 'had', 'is', 'make', 'say', 'seem', 'take', 'use', 'was', 'were', 'will', 'work']);
const irregularVerbLemmas: Record<string, string> = { am: 'be', are: 'be', is: 'be', was: 'be', were: 'be', been: 'be', being: 'be', has: 'have', had: 'have', does: 'do', did: 'do' };

const desktopVerbLexicon = new Set([
  'accept', 'achieve', 'add', 'allow', 'analyze', 'argue', 'arrive', 'ask', 'be', 'become', 'begin', 'believe', 'break', 'bring', 'build', 'call', 'carry', 'change', 'choose', 'claim', 'come', 'compare', 'consider', 'continue', 'create', 'cry', 'cut', 'decide', 'deliver', 'describe', 'develop', 'do', 'drive', 'eat', 'edit', 'enable', 'explain', 'feel', 'find', 'flinch', 'follow', 'get', 'give', 'go', 'grow', 'halt', 'have', 'help', 'highlight', 'identify', 'improve', 'include', 'keep', 'know', 'lead', 'leave', 'let', 'make', 'mean', 'move', 'need', 'offer', 'open', 'place', 'prefer', 'prepare', 'provide', 'put', 'raise', 'read', 'reduce', 'remain', 'remove', 'repeat', 'review', 'run', 'say', 'seem', 'send', 'set', 'shake', 'show', 'sign', 'start', 'stop', 'support', 'take', 'tell', 'think', 'tremble', 'try', 'turn', 'use', 'want', 'walk', 'watch', 'wish', 'work', 'write',
]);
const mobileVerbLexicon = new Set(['be', 'do', 'eat', 'flinch', 'get', 'give', 'go', 'halt', 'have', 'help', 'keep', 'make', 'need', 'read', 'repeat', 'run', 'say', 'seem', 'show', 'sign', 'take', 'think', 'use', 'want', 'wish', 'work', 'write']);
const desktopAdjectiveLexicon = new Set([
  'able', 'basic', 'better', 'big', 'clear', 'colorful', 'common', 'current', 'custom', 'desktop', 'direct', 'early', 'easy', 'entire', 'explicit', 'final', 'focused', 'good', 'great', 'hard', 'honest', 'important', 'internal', 'latest', 'lightweight', 'little', 'local', 'major', 'mobile', 'modern', 'new', 'normal', 'old', 'open', 'personal', 'possible', 'powerful', 'public', 'real', 'reasonable', 'repetitive', 'selected', 'simple', 'small', 'strong', 'subtle', 'surrounding', 'true', 'useful', 'weak',
]);
const mobileAdjectiveLexicon = new Set(['basic', 'clear', 'custom', 'easy', 'good', 'important', 'new', 'old', 'real', 'selected', 'simple', 'strong', 'subtle', 'true', 'weak']);
const desktopNounLexicon = new Set([
  'analysis', 'article', 'background', 'book', 'change', 'class', 'color', 'content', 'day', 'desktop', 'dictionary', 'document', 'editor', 'fact', 'focus', 'font', 'history', 'idea', 'language', 'legend', 'mind', 'mode', 'note', 'noun', 'opinion', 'page', 'panel', 'paragraph', 'person', 'phrase', 'point', 'problem', 'result', 'screen', 'sentence', 'story', 'style', 'syntax', 'text', 'thing', 'time', 'toggle', 'verb', 'word', 'work', 'writer', 'writing',
]);
const mobileNounLexicon = new Set(['color', 'content', 'document', 'editor', 'focus', 'mode', 'note', 'paragraph', 'phrase', 'sentence', 'style', 'syntax', 'text', 'verb', 'word', 'writer', 'writing']);
const adjectiveSuffixes = ['able', 'al', 'ary', 'ful', 'ible', 'ic', 'ish', 'ive', 'less', 'ory', 'ous'];
const nounSuffixes = ['age', 'ance', 'ence', 'er', 'hood', 'ion', 'ism', 'ist', 'ity', 'ment', 'ness', 'or', 'ship', 'sion', 'tion'];
const nounEnds = new Set(['editor', 'reader', 'writer']);

const normalizeSettings = (input: unknown): ZenSettings => {
  const value = (input && typeof input === 'object') ? input as Partial<ZenSettings> : {};
  return {
    enabled: !!value.enabled,
    analysisEnabled: value.analysisEnabled !== false,
    inactiveOpacity: clamp(Number(value.inactiveOpacity ?? defaultSettings.inactiveOpacity), 10, 85),
    contentWidthEm: clamp(Number(value.contentWidthEm ?? defaultSettings.contentWidthEm), 24, 80),
    centerCursor: value.centerCursor !== false,
    focusUnit: clamp(Number(value.focusUnit ?? defaultSettings.focusUnit), 1, 2),
    fontFamily: String(value.fontFamily ?? '').trim(),
    fontSizePx: clamp(Number(value.fontSizePx ?? defaultSettings.fontSizePx), 0, 40),
    centerOffsetVh: clamp(Number(value.centerOffsetVh ?? defaultSettings.centerOffsetVh), -30, 30),
    textColor: String(value.textColor ?? '').trim(),
    backgroundColor: String(value.backgroundColor ?? '').trim(),
    platform: value.platform === 'mobile' ? 'mobile' : 'desktop',
    syntaxHighlightEnabled: value.syntaxHighlightEnabled !== false,
    syntaxHighlightAdjectives: value.syntaxHighlightAdjectives !== false,
    syntaxHighlightNouns: value.syntaxHighlightNouns !== false,
    syntaxHighlightAdverbs: value.syntaxHighlightAdverbs !== false,
    syntaxHighlightVerbs: value.syntaxHighlightVerbs !== false,
    syntaxHighlightConjunctions: value.syntaxHighlightConjunctions !== false,
    syntaxStyleMode: clamp(Number(value.syntaxStyleMode ?? defaultSettings.syntaxStyleMode), 1, 3),
    syntaxColorAdjective: String(value.syntaxColorAdjective ?? defaultSettings.syntaxColorAdjective).trim() || defaultSettings.syntaxColorAdjective,
    syntaxColorNoun: String(value.syntaxColorNoun ?? defaultSettings.syntaxColorNoun).trim() || defaultSettings.syntaxColorNoun,
    syntaxColorAdverb: String(value.syntaxColorAdverb ?? defaultSettings.syntaxColorAdverb).trim() || defaultSettings.syntaxColorAdverb,
    syntaxColorVerb: String(value.syntaxColorVerb ?? defaultSettings.syntaxColorVerb).trim() || defaultSettings.syntaxColorVerb,
    syntaxColorConjunction: String(value.syntaxColorConjunction ?? defaultSettings.syntaxColorConjunction).trim() || defaultSettings.syntaxColorConjunction,
    styleCheckEnabled: !!value.styleCheckEnabled,
    styleCheckFillers: value.styleCheckFillers !== false,
    styleCheckCliches: value.styleCheckCliches !== false,
    styleCheckRedundancies: value.styleCheckRedundancies !== false,
    styleCheckWeakPhrases: value.styleCheckWeakPhrases !== false,
    styleCheckRepetitions: value.styleCheckRepetitions !== false,
    styleCheckStyleMode: clamp(Number(value.styleCheckStyleMode ?? defaultSettings.styleCheckStyleMode), 1, 3),
    styleCheckColorFillers: String(value.styleCheckColorFillers ?? defaultSettings.styleCheckColorFillers).trim() || defaultSettings.styleCheckColorFillers,
    styleCheckColorCliches: String(value.styleCheckColorCliches ?? defaultSettings.styleCheckColorCliches).trim() || defaultSettings.styleCheckColorCliches,
    styleCheckColorRedundancies: String(value.styleCheckColorRedundancies ?? defaultSettings.styleCheckColorRedundancies).trim() || defaultSettings.styleCheckColorRedundancies,
    styleCheckColorWeak: String(value.styleCheckColorWeak ?? defaultSettings.styleCheckColorWeak).trim() || defaultSettings.styleCheckColorWeak,
    styleCheckColorCustom: String(value.styleCheckColorCustom ?? defaultSettings.styleCheckColorCustom).trim() || defaultSettings.styleCheckColorCustom,
    styleCheckColorRepetitions: String(value.styleCheckColorRepetitions ?? defaultSettings.styleCheckColorRepetitions).trim() || defaultSettings.styleCheckColorRepetitions,
    styleCheckTooltipsEnabled: value.styleCheckTooltipsEnabled !== false,
    styleCheckLegendEnabled: value.styleCheckLegendEnabled !== false,
    analysisScope: clamp(Number(value.analysisScope ?? defaultSettings.analysisScope), 1, 2),
    styleCheckExtraFillers: String(value.styleCheckExtraFillers ?? ''),
    styleCheckExtraCliches: String(value.styleCheckExtraCliches ?? ''),
    styleCheckExtraRedundancies: String(value.styleCheckExtraRedundancies ?? ''),
    styleCheckExtraWeakPhrases: String(value.styleCheckExtraWeakPhrases ?? ''),
    styleCheckCustomPatterns: String(value.styleCheckCustomPatterns ?? ''),
  };
};

const enrichTokenNeighbors = (tokens: Token[]) => {
  for (let i = 0; i < tokens.length; i++) {
    tokens[i].prevLower = i > 0 ? tokens[i - 1].lower : '';
    tokens[i].prev2Lower = i > 1 ? tokens[i - 2].lower : '';
    tokens[i].nextLower = i < tokens.length - 1 ? tokens[i + 1].lower : '';
    tokens[i].next2Lower = i < tokens.length - 2 ? tokens[i + 2].lower : '';
  }
  return tokens;
};

const tokenize = (text: string, offset = 0): Token[] => {
  const tokens: Token[] = [];
  wordRegex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text))) {
    tokens.push({ word: match[0], lower: match[0].toLowerCase(), from: offset + match.index, to: offset + match.index + match[0].length, prevLower: '', prev2Lower: '', nextLower: '', next2Lower: '' });
  }
  return enrichTokenNeighbors(tokens);
};

const editorAttrExtension = (settings: ZenSettings) => {
  const classNames = ['jzm-zen-active'];
  if (settings.fontFamily) classNames.push('jzm-custom-font-family');
  if (settings.fontSizePx > 0) classNames.push('jzm-custom-font-size');
  if (settings.textColor) classNames.push('jzm-custom-text-color');
  if (settings.backgroundColor) classNames.push('jzm-custom-background-color');
  classNames.push(settings.syntaxStyleMode === 2 ? 'jzm-syntax-mode-underline' : settings.syntaxStyleMode === 3 ? 'jzm-syntax-mode-background' : 'jzm-syntax-mode-color');
  classNames.push(settings.styleCheckStyleMode === 2 ? 'jzm-stylecheck-mode-dotted' : settings.styleCheckStyleMode === 3 ? 'jzm-stylecheck-mode-wavy' : 'jzm-stylecheck-mode-strike');
  return EditorView.editorAttributes.of({
    class: classNames.join(' '),
    style: [
      `--jzm-inactive-opacity:${settings.inactiveOpacity / 100}`,
      `--jzm-content-max-width:${settings.contentWidthEm}em`,
      `--jzm-font-size:${settings.fontSizePx}px`,
      `--jzm-center-offset:${settings.centerOffsetVh}vh`,
      `--jzm-font-family:${settings.fontFamily || 'inherit'}`,
      `--jzm-text-color:${settings.textColor || 'var(--joplin-color)'}`,
      `--jzm-background-color:${settings.backgroundColor || 'var(--joplin-background-color)'}`,
      `--jzm-syntax-adjective-color:${settings.syntaxColorAdjective}`,
      `--jzm-syntax-noun-color:${settings.syntaxColorNoun}`,
      `--jzm-syntax-adverb-color:${settings.syntaxColorAdverb}`,
      `--jzm-syntax-verb-color:${settings.syntaxColorVerb}`,
      `--jzm-syntax-conjunction-color:${settings.syntaxColorConjunction}`,
      `--jzm-stylecheck-fillers-color:${settings.styleCheckColorFillers}`,
      `--jzm-stylecheck-cliches-color:${settings.styleCheckColorCliches}`,
      `--jzm-stylecheck-redundancies-color:${settings.styleCheckColorRedundancies}`,
      `--jzm-stylecheck-weak-color:${settings.styleCheckColorWeak}`,
      `--jzm-stylecheck-custom-color:${settings.styleCheckColorCustom}`,
      `--jzm-stylecheck-repetition-color:${settings.styleCheckColorRepetitions}`,
    ].join(';'),
  });
};

const fullText = (view: EditorView) => view.state.doc.toString();

const sentenceRangeWithSegmenter = (text: string, pos: number) => {
  try {
    if (!(globalThis as any).Intl?.Segmenter) return null;
    const SegmenterCtor = (Intl as any).Segmenter;
    const segmenter = new SegmenterCtor(undefined, { granularity: 'sentence' });
    const segments = segmenter.segment(text);
    for (const segment of segments as any) {
      const start = segment.index as number;
      const end = start + String(segment.segment).length;
      if (pos >= start && pos < end) return { from: start, to: end };
    }
  } catch (_error) { return null; }
  return null;
};

const sentenceRangeFallback = (text: string, pos: number) => {
  let start = 0;
  let end = text.length;
  for (let i = pos - 1; i >= 0; i--) {
    if (/[.!?]\s/.test(text.slice(i, i + 2)) || /\n\n/.test(text.slice(i, i + 2))) { start = i + 1; break; }
  }
  for (let i = pos; i < text.length; i++) {
    if (/[.!?]\s/.test(text.slice(i, i + 2)) || /\n\n/.test(text.slice(i, i + 2))) { end = i + 1; break; }
  }
  return { from: start, to: end };
};

const focusRangeAt = (view: EditorView, pos: number, focusUnit: number) => {
  if (focusUnit === 2) {
    const text = fullText(view);
    return sentenceRangeWithSegmenter(text, pos) ?? sentenceRangeFallback(text, pos);
  }
  const doc = view.state.doc;
  const currentLine = doc.lineAt(pos);
  const isBlank = (lineNumber: number) => doc.line(lineNumber).text.trim() === '';
  if (isBlank(currentLine.number)) return { from: currentLine.from, to: currentLine.to };
  let firstLine = currentLine.number;
  let lastLine = currentLine.number;
  while (firstLine > 1 && !isBlank(firstLine - 1)) firstLine--;
  while (lastLine < doc.lines && !isBlank(lastLine + 1)) lastLine++;
  return { from: doc.line(firstLine).from, to: doc.line(lastLine).to };
};

const buildFocusDecorations = (view: EditorView, settings: ZenSettings) => {
  const active = focusRangeAt(view, view.state.selection.main.head, settings.focusUnit);
  const decorations: any[] = [];

  if (settings.focusUnit === 2) {
    for (const range of view.visibleRanges) {
      const beforeFrom = range.from;
      const beforeTo = Math.min(range.to, active.from);
      const afterFrom = Math.max(range.from, active.to);
      const afterTo = range.to;
      if (beforeFrom < beforeTo) decorations.push(Decoration.mark({ class: 'jzm-dim-text' }).range(beforeFrom, beforeTo));
      if (afterFrom < afterTo) decorations.push(Decoration.mark({ class: 'jzm-dim-text' }).range(afterFrom, afterTo));
    }
    return decorations;
  }

  for (const range of view.visibleRanges) {
    let line = view.state.doc.lineAt(range.from);
    while (true) {
      const intersects = !(line.to < active.from || line.from > active.to);
      decorations.push(Decoration.line({ class: intersects ? 'jzm-active-paragraph-line' : 'jzm-dim-line' }).range(line.from));
      if (line.to >= range.to || line.number >= view.state.doc.lines) break;
      line = view.state.doc.line(line.number + 1);
    }
  }
  return decorations;
};

// NOTE-BACKED LIST PATCH: The main plugin resolves note links/IDs into newline-delimited
// text before sending settings here. This parser additionally accepts simple Markdown
// list notes, while preserving the original one-phrase-per-line behavior.
const parsePhraseList = (source: string) => {
  const phrases: string[] = [];
  let inFence = false;
  for (const rawLine of source.split(/\r?\n/g)) {
    let line = rawLine.trim();
    if (/^(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence || !line) continue;
    if (/^#{1,6}\s+/.test(line)) continue;
    if (/^<!--.*-->$/.test(line)) continue;
    if (/^[-*_]{3,}$/.test(line)) continue;
    line = line.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').replace(/^\[[ xX]\]\s+/, '').trim();
    if (line) phrases.push(line);
  }
  return phrases;
};

const parseCustomPatterns = (source: string) => {
  const rules: RegExp[] = [];
  const exceptions: RegExp[] = [];
  for (const rawLine of source.split(/\r?\n/g)) {
    const line = rawLine.trim();
    if (!line) continue;
    const isException = line.startsWith('-');
    const body = (isException ? line.slice(1) : line).trim();
    if (!body) continue;
    let regex: RegExp | null = null;
    if (body.startsWith('/') && body.lastIndexOf('/') > 0) {
      const lastSlash = body.lastIndexOf('/');
      const pattern = body.slice(1, lastSlash);
      const flags = body.slice(lastSlash + 1) || 'gi';
      try { regex = new RegExp(pattern, flags.includes('g') ? flags : `g${flags}`); } catch (_error) { regex = null; }
    } else {
      regex = phraseRegex(body);
    }
    if (!regex) continue;
    if (isException) exceptions.push(regex);
    else rules.push(regex);
  }
  return { rules, exceptions };
};

let cachedStyleRulesKey = '';
let cachedStyleRules: RuleDef[] = [];
let cachedCustomPatternsKey = '';
let cachedCustomPatterns: { rules: RegExp[]; exceptions: RegExp[] } = { rules: [], exceptions: [] };

const styleRulesCacheKey = (settings: ZenSettings) => JSON.stringify([
  settings.platform,
  settings.styleCheckFillers,
  settings.styleCheckCliches,
  settings.styleCheckRedundancies,
  settings.styleCheckWeakPhrases,
  settings.styleCheckExtraFillers,
  settings.styleCheckExtraCliches,
  settings.styleCheckExtraRedundancies,
  settings.styleCheckExtraWeakPhrases,
]);

const customPatternsForSettings = (settings: ZenSettings) => {
  if (settings.styleCheckCustomPatterns !== cachedCustomPatternsKey) {
    cachedCustomPatternsKey = settings.styleCheckCustomPatterns;
    cachedCustomPatterns = parseCustomPatterns(settings.styleCheckCustomPatterns);
  }
  return cachedCustomPatterns;
};

const buildStyleRules = (settings: ZenSettings): RuleDef[] => {
  const source = settings.platform === 'desktop'
    ? { fillers: desktopFillers, cliches: desktopCliches, redundancies: desktopRedundancies, weak: desktopWeakPhrases }
    : { fillers: mobileFillers, cliches: mobileCliches, redundancies: mobileRedundancies, weak: mobileWeakPhrases };
  const fillers = source.fillers.concat(parsePhraseList(settings.styleCheckExtraFillers));
  const cliches = source.cliches.concat(parsePhraseList(settings.styleCheckExtraCliches));
  const redundancies = source.redundancies.concat(parsePhraseList(settings.styleCheckExtraRedundancies));
  const weakPhrases = source.weak.concat(parsePhraseList(settings.styleCheckExtraWeakPhrases));
  const rules: RuleDef[] = [];
  if (settings.styleCheckFillers) for (const phrase of fillers) rules.push({ kind: 'fillers', regex: phraseRegex(phrase) });
  if (settings.styleCheckCliches) for (const phrase of cliches) rules.push({ kind: 'cliches', regex: phraseRegex(phrase) });
  if (settings.styleCheckRedundancies) for (const phrase of redundancies) rules.push({ kind: 'redundancies', regex: phraseRegex(phrase) });
  if (settings.styleCheckWeakPhrases) {
    for (const phrase of weakPhrases) rules.push({ kind: 'weak', regex: phraseRegex(phrase) });
    rules.push({ kind: 'weak', regex: /\b(am|are|be|been|being|is|was|were)\b/gi });
  }
  return rules;
};

const cachedBuildStyleRules = (settings: ZenSettings): RuleDef[] => {
  const key = styleRulesCacheKey(settings);
  if (key !== cachedStyleRulesKey) {
    cachedStyleRulesKey = key;
    cachedStyleRules = buildStyleRules(settings);
  }
  return cachedStyleRules;
};

const filterOverlaps = (matches: MarkMatch[]) => {
  matches.sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from));
  const filtered: MarkMatch[] = [];
  let currentEnd = -1;
  for (const match of matches) {
    if (match.from < currentEnd) continue;
    filtered.push(match);
    currentEnd = match.to;
  }
  return filtered;
};

const lemmaOf = (word: string) => {
  const lower = word.toLowerCase();
  if (irregularVerbLemmas[lower]) return irregularVerbLemmas[lower];
  if (lower.endsWith('ies') && lower.length > 4) return `${lower.slice(0, -3)}y`;
  if (lower.endsWith('ing') && lower.length > 5) return lower.slice(0, -3);
  if (lower.endsWith('ed') && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('es') && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('s') && lower.length > 3) return lower.slice(0, -1);
  return lower;
};

let winkDesktopInstance: any = null;
let winkDesktopIts: any = null;
const getWinkDesktop = () => {
  if (!winkDesktopInstance) {
    winkDesktopInstance = winkNLP(winkModel, ['sbd', 'pos']);
    winkDesktopIts = winkDesktopInstance.its;
  }
  return { nlp: winkDesktopInstance, its: winkDesktopIts };
};

const desktopTokensFromWink = (text: string, offset = 0): Token[] => {
  const { nlp, its } = getWinkDesktop();
  const doc = nlp.readDoc(text);
  const values = doc.tokens().out(its.value) as string[];
  const types = doc.tokens().out(its.type) as string[];
  const poses = doc.tokens().out(its.pos) as string[];
  const lemmas = doc.tokens().out(its.lemma) as string[];
  const tokens: Token[] = [];
  let cursor = 0;
  for (let i = 0; i < values.length; i++) {
    const type = String(types[i] || '');
    if (type !== 'word') continue;
    const value = String(values[i] || '');
    let foundIndex = text.indexOf(value, cursor);
    if (foundIndex < 0) {
      const fallback = new RegExp(`\\b${escapeRegex(value)}\\b`, 'i').exec(text.slice(cursor));
      if (!fallback || fallback.index === undefined) continue;
      foundIndex = cursor + fallback.index;
    }
    tokens.push({ word: value, lower: value.toLowerCase(), from: offset + foundIndex, to: offset + foundIndex + value.length, prevLower: '', prev2Lower: '', nextLower: '', next2Lower: '', lemma: String(lemmas[i] || value).toLowerCase(), posTag: String(poses[i] || '') });
    cursor = foundIndex + value.length;
  }
  return enrichTokenNeighbors(tokens);
};

const looksLikeLikelyNoun = (lower: string) => desktopNounLexicon.has(lower) || nounSuffixes.some(s => lower.endsWith(s)) || nounEnds.has(lower) || (lower.endsWith('s') && lower.length > 3 && !lower.endsWith('ly'));
const determinerBasedNoun = (token: Token) => determiners.has(token.prevLower) || determiners.has(token.prev2Lower);

const classifyWordMobile = (token: Token, settings: ZenSettings): SyntaxKind | null => {
  const lower = token.lower;
  const lemma = lemmaOf(lower);
  const gerundLike = /ing$/.test(lower);
  if (settings.syntaxHighlightConjunctions && mobileConjunctions.has(lower)) return 'conjunction';
  if (settings.syntaxHighlightAdverbs && (/ly$/i.test(lower) || ['not', 'never', 'quite', 'rather', 'soon', 'very'].includes(lower))) return 'adverb';
  if (settings.syntaxHighlightVerbs && (mobileVerbLexicon.has(lower) || mobileVerbLexicon.has(lemma) || ((pronouns.has(token.prevLower) || mobileConjunctions.has(token.prevLower) || intensifiers.has(token.prevLower) || pronouns.has(token.prev2Lower)) && /(s|es|ies)$/.test(lower)) || (gerundLike && !determinerBasedNoun(token) && (gerundPrepositions.has(token.prevLower) || determiners.has(token.nextLower) || looksLikeLikelyNoun(token.nextLower) || looksLikeLikelyNoun(token.next2Lower) || token.nextLower === 'and')) || /(ed|en|fy|ise|ize)$/.test(lower))) return 'verb';
  if (settings.syntaxHighlightAdjectives && (mobileAdjectiveLexicon.has(lower) || (intensifiers.has(token.prevLower) && !mobileConjunctions.has(token.nextLower)) || adjectiveSuffixes.some(s => lower.endsWith(s)))) return 'adjective';
  if (settings.syntaxHighlightNouns && (mobileNounLexicon.has(lower) || mobileNounLexicon.has(lemma) || determinerBasedNoun(token) || nounSuffixes.some(s => lower.endsWith(s)) || nounEnds.has(lower))) return 'noun';
  return null;
};

const classifyWordDesktopHeuristic = (token: Token, settings: ZenSettings): SyntaxKind | null => {
  const lower = token.lower;
  const lemma = lemmaOf(lower);
  const prev = token.prevLower;
  const prev2 = token.prev2Lower;
  const next = token.nextLower;
  const next2 = token.next2Lower;
  const gerundLike = /ing$/.test(lower);
  if (settings.syntaxHighlightConjunctions && desktopConjunctions.has(lower)) return 'conjunction';
  const scores: Record<SyntaxKind, number> = { adjective: 0, noun: 0, adverb: 0, verb: 0, conjunction: 0 };
  if (/ly$/i.test(lower) || ['never', 'not', 'quite', 'rather', 'soon', 'too', 'very'].includes(lower)) scores.adverb += 6;
  if (desktopVerbLexicon.has(lower) || desktopVerbLexicon.has(lemma)) scores.verb += 4;
  if (desktopAdjectiveLexicon.has(lower)) scores.adjective += 4;
  if (desktopNounLexicon.has(lower) || desktopNounLexicon.has(lemma)) scores.noun += 4;
  if (prev === 'to') scores.verb += 5;
  if (pronouns.has(prev)) scores.verb += 3;
  if (auxiliaries.has(prev)) scores.verb += 3;
  if (intensifiers.has(prev) && pronouns.has(prev2)) scores.verb += 3;
  if (desktopConjunctions.has(prev) && lemmaOf(prev2) === lemma) scores.verb += 6;
  if (desktopConjunctions.has(next) && lemmaOf(next2) === lemma) scores.verb += 3;
  if (gerundLike && !determinerBasedNoun(token)) scores.verb += 4;
  if (gerundLike && (gerundPrepositions.has(prev) || pronouns.has(prev) || desktopConjunctions.has(prev))) scores.verb += 3;
  if (gerundLike && (determiners.has(next) || looksLikeLikelyNoun(next) || looksLikeLikelyNoun(next2))) scores.verb += 4;
  if (determinerBasedNoun(token)) scores.noun += 3;
  if (intensifiers.has(prev) || auxiliaries.has(prev)) scores.adjective += 2;
  if (determiners.has(prev) && next && !desktopConjunctions.has(next)) scores.adjective += 2;
  if (auxiliaries.has(prev) && adjectiveSuffixes.some(s => lower.endsWith(s))) scores.adjective += 2;
  if (next) {
    if (desktopNounLexicon.has(next) || nounSuffixes.some(s => next.endsWith(s)) || nounEnds.has(next)) scores.adjective += 3;
    if (desktopConjunctions.has(next) && lemmaOf(next2) === lemma) scores.verb += 3;
  }
  if (adjectiveSuffixes.some(s => lower.endsWith(s))) scores.adjective += 2;
  if (nounSuffixes.some(s => lower.endsWith(s)) || nounEnds.has(lower)) scores.noun += 2;
  if (/(ed|en|fy|ise|ize)$/.test(lower)) scores.verb += 2;
  if (/(s|es|ies)$/.test(lower) && (pronouns.has(prev) || desktopConjunctions.has(prev) || desktopConjunctions.has(next))) scores.verb += 4;
  if (scores.adverb >= 6) return settings.syntaxHighlightAdverbs ? 'adverb' : null;
  const ranking: SyntaxKind[] = ['verb', 'adjective', 'noun'];
  let best: SyntaxKind | null = null;
  let bestScore = 0;
  for (const kind of ranking) if (scores[kind] > bestScore) { best = kind; bestScore = scores[kind]; }
  if (best && bestScore >= 4) {
    if (best === 'adjective' && !settings.syntaxHighlightAdjectives) return null;
    if (best === 'noun' && !settings.syntaxHighlightNouns) return null;
    if (best === 'verb' && !settings.syntaxHighlightVerbs) return null;
    return best;
  }
  return null;
};

const classifyWordDesktop = (token: Token, settings: ZenSettings): SyntaxKind | null => {
  const pos = token.posTag || '';
  if (pos === 'ADJ') return settings.syntaxHighlightAdjectives ? 'adjective' : null;
  if (pos === 'NOUN' || pos === 'PROPN') return settings.syntaxHighlightNouns ? 'noun' : null;
  if (pos === 'ADV') return settings.syntaxHighlightAdverbs ? 'adverb' : null;
  if (pos === 'VERB') return settings.syntaxHighlightVerbs ? 'verb' : null;
  if (pos === 'CCONJ' || pos === 'SCONJ') return settings.syntaxHighlightConjunctions ? 'conjunction' : null;
  return classifyWordDesktopHeuristic(token, settings);
};

const classifyToken = (token: Token, settings: ZenSettings) => settings.platform === 'desktop' ? classifyWordDesktop(token, settings) : classifyWordMobile(token, settings);

const buildSyntaxMatches = (text: string, offset: number, settings: ZenSettings) => {
  if (!settings.syntaxHighlightEnabled) return [] as MarkMatch[];
  const tokens = settings.platform === 'desktop' ? desktopTokensFromWink(text, offset) : tokenize(text, offset);
  const matches: MarkMatch[] = [];
  for (const token of tokens) {
    const kind = classifyToken(token, settings);
    if (!kind) continue;
    matches.push({ from: token.from, to: token.to, kind });
  }
  return matches;
};

const styleCheckTitle = (kind: Exclude<StyleKind, 'repetition'>, matchedText: string) => {
  const clean = matchedText.trim();
  if (kind === 'fillers') return `Filler: “${clean}” — often weakens prose; consider deleting it.`;
  if (kind === 'cliches') return `Cliché: “${clean}” — familiar phrase; consider a fresher image.`;
  if (kind === 'redundancies') return `Redundancy: “${clean}” — both words express overlapping ideas.`;
  if (kind === 'weak') return `Weak phrase: “${clean}” — consider a stronger, more direct verb.`;
  return `Custom style pattern: “${clean}”`;
};

const collectRegexMatches = (text: string, offset: number, regexes: RegExp[], kind: Exclude<StyleKind, 'custom' | 'repetition'> | 'custom', exceptions: RegExp[]) => {
  const matches: MarkMatch[] = [];
  for (const originalRegex of regexes) {
    const regex = new RegExp(originalRegex.source, originalRegex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      const matchedText = text.slice(match.index, match.index + match[0].length);
      if (matchedText.trim() && !exceptions.some(exception => new RegExp(exception.source, exception.flags).test(matchedText))) matches.push({ from: offset + match.index, to: offset + match.index + match[0].length, kind, title: styleCheckTitle(kind, matchedText) });
      if (match[0].length === 0) regex.lastIndex++;
    }
  }
  return matches;
};

const splitParagraphs = (text: string, offset = 0) => {
  const out: { text: string; offset: number }[] = [];
  const parts = text.split(/\n\s*\n/g);
  let cursor = 0;
  for (const part of parts) {
    const localIndex = text.indexOf(part, cursor);
    out.push({ text: part, offset: offset + localIndex });
    cursor = localIndex + part.length + 1;
  }
  return out;
};

const collectRepetitionMatches = (text: string, offset: number, settings: ZenSettings) => {
  if (!settings.styleCheckRepetitions) return [] as MarkMatch[];
  const tokens = settings.platform === 'desktop' ? desktopTokensFromWink(text, offset) : tokenize(text, offset);
  const counts = new Map<string, { count: number; kind: SyntaxKind }>();
  const seen = new Map<string, number>();
  for (const token of tokens) {
    const kind = classifyToken(token, settings);
    if (!(kind === 'adjective' || kind === 'verb' || kind === 'adverb')) continue;
    const lemma = token.lemma || lemmaOf(token.word);
    if (kind === 'verb' && commonVerbsToIgnoreForRepetition.has(lemma)) continue;
    const current = counts.get(lemma) ?? { count: 0, kind };
    current.count += 1;
    current.kind = kind;
    counts.set(lemma, current);
  }
  const matches: MarkMatch[] = [];
  for (const token of tokens) {
    const kind = classifyToken(token, settings);
    if (!(kind === 'adjective' || kind === 'verb' || kind === 'adverb')) continue;
    const lemma = token.lemma || lemmaOf(token.word);
    const countInfo = counts.get(lemma);
    if (!countInfo || countInfo.count < 2) continue;
    if (kind === 'verb' && commonVerbsToIgnoreForRepetition.has(lemma)) continue;
    const seenCount = (seen.get(lemma) ?? 0) + 1;
    seen.set(lemma, seenCount);
    if (seenCount < 2) continue;
    matches.push({ from: token.from, to: token.to, kind: 'repetition', title: `Repeated ${kind} in this paragraph: “${token.word}”` });
  }
  return matches;
};

const buildSyntaxDecorations = (view: EditorView, settings: ZenSettings) => {
  const matches: MarkMatch[] = [];
  if (!settings.analysisEnabled || !settings.syntaxHighlightEnabled) return [] as any[];
  if (settings.platform === 'desktop' && settings.analysisScope === 1) matches.push(...buildSyntaxMatches(fullText(view), 0, settings));
  else for (const range of view.visibleRanges) matches.push(...buildSyntaxMatches(view.state.doc.sliceString(range.from, range.to), range.from, settings));
  return filterOverlaps(matches).map(match => Decoration.mark({ class: `jzm-syntax jzm-syntax-${match.kind}` }).range(match.from, match.to));
};

const buildStyleDecorations = (view: EditorView, settings: ZenSettings) => {
  if (!settings.analysisEnabled || !settings.styleCheckEnabled) return [] as any[];
  const rules = cachedBuildStyleRules(settings);
  const custom = customPatternsForSettings(settings);
  const matches: MarkMatch[] = [];
  const collectForBlock = (text: string, offset: number) => {
    for (const rule of rules) matches.push(...collectRegexMatches(text, offset, [rule.regex], rule.kind, custom.exceptions));
    matches.push(...collectRegexMatches(text, offset, custom.rules, 'custom', custom.exceptions));
    matches.push(...collectRepetitionMatches(text, offset, settings));
  };
  if (settings.platform === 'desktop' && settings.analysisScope === 1) for (const paragraph of splitParagraphs(fullText(view), 0)) collectForBlock(paragraph.text, paragraph.offset);
  else for (const range of view.visibleRanges) for (const paragraph of splitParagraphs(view.state.doc.sliceString(range.from, range.to), range.from)) collectForBlock(paragraph.text, paragraph.offset);
  return filterOverlaps(matches).map(match => Decoration.mark({
    class: `jzm-stylecheck jzm-stylecheck-${match.kind}`,
    attributes: settings.styleCheckTooltipsEnabled && match.title ? { title: match.title } : undefined,
  }).range(match.from, match.to));
};

class ZenEditorState {
  public decorations: DecorationSet = Decoration.none;
  private lastCenteredLine = -1;
  private analysisTimer: any = null;
  private cachedSyntaxDecorations: any[] = [];
  private cachedStyleDecorations: any[] = [];
  private legendElement: HTMLElement | null = null;
  public constructor(private readonly view: EditorView, private readonly settings: ZenSettings) {
    this.setupLegend();
    this.rebuildAnalysis();
    this.rebuildAll(true);
  }

  private setupLegend() {
    if (!this.settings.styleCheckLegendEnabled) return;
    const legend = document.createElement('div');
    legend.className = 'jzm-stylecheck-legend';
    const items: { kind: StyleKind; label: string }[] = [
      { kind: 'fillers', label: 'filler' },
      { kind: 'cliches', label: 'cliché' },
      { kind: 'redundancies', label: 'redundancy' },
      { kind: 'weak', label: 'weak phrase' },
      { kind: 'custom', label: 'custom' },
      { kind: 'repetition', label: 'repetition' },
    ];
    for (const item of items) {
      const span = document.createElement('span');
      span.className = `jzm-stylecheck jzm-stylecheck-${item.kind}`;
      span.textContent = item.label;
      legend.appendChild(span);
    }
    this.view.dom.appendChild(legend);
    this.legendElement = legend;
  }

  private rebuildAll(forceCenter = false) {
    const decorationParts = [...buildFocusDecorations(this.view, this.settings), ...this.cachedSyntaxDecorations, ...this.cachedStyleDecorations];
    this.decorations = Decoration.set(decorationParts, true);
    this.centerCursor(forceCenter);
  }
  private rebuildAnalysis() {
    this.cachedSyntaxDecorations = buildSyntaxDecorations(this.view, this.settings);
    this.cachedStyleDecorations = buildStyleDecorations(this.view, this.settings);
  }
  private scheduleAnalysis() {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisTimer = setTimeout(() => {
      this.analysisTimer = null;
      this.rebuildAnalysis();
      this.rebuildAll(false);
    }, this.settings.platform === 'desktop' ? 200 : 280);
  }
  private centerCursor(force = false) {
    if (!this.settings.centerCursor) return;
    if (!this.view.hasFocus) return;
    const selection = this.view.state.selection.main;
    if (!selection.empty) return;
    const lineNumber = this.view.state.doc.lineAt(selection.head).number;
    if (!force && lineNumber === this.lastCenteredLine) return;
    this.view.requestMeasure({
      read: (view) => {
        const coords = view.coordsAtPos(selection.head);
        if (!coords) return null;
        const scrollDOM = view.scrollDOM;
        const scrollerRect = scrollDOM.getBoundingClientRect();
        const lineMiddle = ((coords.top + coords.bottom) / 2) - scrollerRect.top + scrollDOM.scrollTop;
        const target = Math.max(0, lineMiddle - scrollDOM.clientHeight / 2);
        return { target, lineNumber };
      },
      write: (measure) => {
        if (!measure) return;
        if (Math.abs(this.view.scrollDOM.scrollTop - measure.target) > 2) this.view.scrollDOM.scrollTop = measure.target;
        this.lastCenteredLine = measure.lineNumber;
      },
    });
  }
  public update(update: ViewUpdate) {
    if (update.docChanged || (update.viewportChanged && (this.settings.platform === 'mobile' || this.settings.analysisScope === 2))) this.scheduleAnalysis();
    if (update.selectionSet || update.docChanged || update.viewportChanged || update.focusChanged) this.rebuildAll(update.focusChanged);
  }
  public destroy() {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    if (this.legendElement) this.legendElement.remove();
  }
}

export default (context: ContentScriptContext) => {
  const zenCompartment = new Compartment();
  const zenExtension = (settings: ZenSettings) => [
    editorAttrExtension(settings),
    ViewPlugin.fromClass(class {
      public decorations: DecorationSet;
      private readonly state: ZenEditorState;
      public constructor(view: EditorView) { this.state = new ZenEditorState(view, settings); this.decorations = this.state.decorations; }
      public update(update: ViewUpdate) { this.state.update(update); this.decorations = this.state.decorations; }
      public destroy() { this.state.destroy(); }
    }, { decorations: plugin => plugin.decorations }),
  ];
  const applySettings = (codeMirrorWrapper: any, input: unknown) => {
    const settings = normalizeSettings(input);
    codeMirrorWrapper.editor.dispatch({ effects: zenCompartment.reconfigure(settings.enabled ? zenExtension(settings) : []) });
  };
  return {
    plugin: async (codeMirrorWrapper: any) => {
      if (!codeMirrorWrapper?.cm6) return;
      codeMirrorWrapper.addExtension(zenCompartment.of([]));
      codeMirrorWrapper.registerCommand('joplinZen__applySettings', (settings: unknown) => applySettings(codeMirrorWrapper, settings));
      codeMirrorWrapper.registerCommand('joplinZen__getSelection', () => {
        const selection = codeMirrorWrapper.editor.state.selection.main;
        return codeMirrorWrapper.editor.state.doc.sliceString(selection.from, selection.to);
      });
      try { applySettings(codeMirrorWrapper, await context.postMessage('getSettings')); } catch (_error) { applySettings(codeMirrorWrapper, defaultSettings); }
    },
    assets: () => [{ name: './style.css' }],
  };
};
