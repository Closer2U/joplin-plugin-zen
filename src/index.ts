import joplin from 'api';
import { ContentScriptType, MenuItemLocation, SettingItemType, ToolbarButtonLocation } from 'api/types';

type Platform = 'desktop' | 'mobile';

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

const PLUGIN_ID = 'io.arena.joplinzenmode';
const CONTENT_SCRIPT_ID = 'zenCodeMirror6';
const SECTION = 'zenModeSection';
const CMD_TOGGLE = `${PLUGIN_ID}.toggleZenMode`;
const CMD_ENABLE = `${PLUGIN_ID}.enableZenMode`;
const CMD_DISABLE = `${PLUGIN_ID}.disableZenMode`;
const CMD_TOGGLE_ANALYSIS = `${PLUGIN_ID}.toggleZenAnalysis`;
const CMD_ADD_SELECTION_FILLER = `${PLUGIN_ID}.addSelectionToFillers`;
const CMD_ADD_SELECTION_CLICHE = `${PLUGIN_ID}.addSelectionToCliches`;
const CMD_ADD_SELECTION_REDUNDANCY = `${PLUGIN_ID}.addSelectionToRedundancies`;
const CMD_ADD_SELECTION_WEAK = `${PLUGIN_ID}.addSelectionToWeakPhrases`;
const CMD_CREATE_PHRASE_NOTES = `${PLUGIN_ID}.createDefaultPhraseListNotes`;

const SETTING_ENABLED = 'enabled';
const SETTING_ANALYSIS_ENABLED = 'analysisEnabled';
const SETTING_OPACITY = 'inactiveOpacity';
const SETTING_WIDTH = 'contentWidthEm';
const SETTING_CENTER = 'centerCursor';
const SETTING_FOCUS_UNIT = 'focusUnit';
const SETTING_FONT_FAMILY = 'fontFamily';
const SETTING_FONT_SIZE = 'fontSizePx';
const SETTING_CENTER_OFFSET = 'centerOffsetVh';
const SETTING_TEXT_COLOR = 'textColor';
const SETTING_BACKGROUND_COLOR = 'backgroundColor';
const SETTING_SYNTAX_HIGHLIGHT_ENABLED = 'syntaxHighlightEnabled';
const SETTING_SYNTAX_HIGHLIGHT_ADJECTIVES = 'syntaxHighlightAdjectives';
const SETTING_SYNTAX_HIGHLIGHT_NOUNS = 'syntaxHighlightNouns';
const SETTING_SYNTAX_HIGHLIGHT_ADVERBS = 'syntaxHighlightAdverbs';
const SETTING_SYNTAX_HIGHLIGHT_VERBS = 'syntaxHighlightVerbs';
const SETTING_SYNTAX_HIGHLIGHT_CONJUNCTIONS = 'syntaxHighlightConjunctions';
const SETTING_SYNTAX_STYLE_MODE = 'syntaxStyleMode';
const SETTING_SYNTAX_COLOR_ADJECTIVE = 'syntaxColorAdjective';
const SETTING_SYNTAX_COLOR_NOUN = 'syntaxColorNoun';
const SETTING_SYNTAX_COLOR_ADVERB = 'syntaxColorAdverb';
const SETTING_SYNTAX_COLOR_VERB = 'syntaxColorVerb';
const SETTING_SYNTAX_COLOR_CONJUNCTION = 'syntaxColorConjunction';
const SETTING_STYLECHECK_ENABLED = 'styleCheckEnabled';
const SETTING_STYLECHECK_FILLERS = 'styleCheckFillers';
const SETTING_STYLECHECK_CLICHES = 'styleCheckCliches';
const SETTING_STYLECHECK_REDUNDANCIES = 'styleCheckRedundancies';
const SETTING_STYLECHECK_WEAK_PHRASES = 'styleCheckWeakPhrases';
const SETTING_STYLECHECK_REPETITIONS = 'styleCheckRepetitions';
const SETTING_STYLECHECK_STYLE_MODE = 'styleCheckStyleMode';
const SETTING_STYLECHECK_COLOR_FILLERS = 'styleCheckColorFillers';
const SETTING_STYLECHECK_COLOR_CLICHES = 'styleCheckColorCliches';
const SETTING_STYLECHECK_COLOR_REDUNDANCIES = 'styleCheckColorRedundancies';
const SETTING_STYLECHECK_COLOR_WEAK = 'styleCheckColorWeak';
const SETTING_STYLECHECK_COLOR_CUSTOM = 'styleCheckColorCustom';
const SETTING_STYLECHECK_COLOR_REPETITIONS = 'styleCheckColorRepetitions';
const SETTING_STYLECHECK_TOOLTIPS_ENABLED = 'styleCheckTooltipsEnabled';
const SETTING_STYLECHECK_LEGEND_ENABLED = 'styleCheckLegendEnabled';
const SETTING_ANALYSIS_SCOPE = 'analysisScope';
const SETTING_DEFAULT_PHRASE_NOTES_CREATED = 'defaultPhraseNotesCreated';
const SETTING_STYLECHECK_EXTRA_FILLERS = 'styleCheckExtraFillers';
const SETTING_STYLECHECK_EXTRA_CLICHES = 'styleCheckExtraCliches';
const SETTING_STYLECHECK_EXTRA_REDUNDANCIES = 'styleCheckExtraRedundancies';
const SETTING_STYLECHECK_EXTRA_WEAK_PHRASES = 'styleCheckExtraWeakPhrases';
const SETTING_STYLECHECK_CUSTOM_PATTERNS = 'styleCheckCustomPatterns';

let updateRetrySerial = 0;
let cachedPlatform: Platform | null = null;
let cachedPhraseListNoteIds: Set<string> = new Set();
let phraseListRefreshTimer: any = null;

const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const STYLECHECK_EXTRA_NOTE_SETTING_KEYS = [
  SETTING_STYLECHECK_EXTRA_FILLERS,
  SETTING_STYLECHECK_EXTRA_CLICHES,
  SETTING_STYLECHECK_EXTRA_REDUNDANCIES,
  SETTING_STYLECHECK_EXTRA_WEAK_PHRASES,
];

const PHRASE_NOTE_SETTINGS = [
  { key: SETTING_STYLECHECK_EXTRA_FILLERS, title: 'Zen Mode — Extra Fillers', seed: '# Extra fillers to flag\n\nAdd one phrase per line. You can move this note to any notebook.\n', label: 'fillers' },
  { key: SETTING_STYLECHECK_EXTRA_CLICHES, title: 'Zen Mode — Extra Clichés', seed: '# Extra clichés to flag\n\nAdd one phrase per line. You can move this note to any notebook.\n', label: 'clichés' },
  { key: SETTING_STYLECHECK_EXTRA_REDUNDANCIES, title: 'Zen Mode — Extra Redundancies', seed: '# Extra redundancies to flag\n\nAdd one phrase per line. You can move this note to any notebook.\n', label: 'redundancies' },
  { key: SETTING_STYLECHECK_EXTRA_WEAK_PHRASES, title: 'Zen Mode — Extra Weak Phrases', seed: '# Extra weak phrases to flag\n\nAdd one phrase per line. You can move this note to any notebook.\n', label: 'weak phrases' },
];

const extractJoplinNoteId = (value: unknown): string => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const match = text.match(/[a-f0-9]{32}/i);
  return match ? match[0].toLowerCase() : '';
};

const normalisePhraseListNoteBody = (body: string): string => {
  const phrases: string[] = [];
  let inFence = false;
  for (const rawLine of body.split(/\r?\n/g)) {
    let line = rawLine.trim();
    if (/^(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence || !line) continue;
    if (/^#{1,6}\s+/.test(line)) continue;
    if (/^<!--.*-->$/.test(line)) continue;
    if (/^[-*_]{3,}$/.test(line)) continue;
    line = line.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').replace(/^\[[ xX]\]\s+/, '').trim();
    if (line) phrases.push(line);
  }
  return phrases.join('\n');
};

const phraseListFromNoteReference = async (settingValue: unknown): Promise<string> => {
  const rawValue = String(settingValue ?? '').trim();
  if (!rawValue) return '';
  const noteId = extractJoplinNoteId(rawValue);
  if (!noteId) return rawValue; // Backwards compatibility for existing literal lists.
  try {
    const note = await joplin.data.get(['notes', noteId], { fields: ['id', 'title', 'body'] });
    return normalisePhraseListNoteBody(String(note?.body ?? ''));
  } catch (error) {
    console.warn(`Zen Mode: Could not read phrase-list note ${noteId}`, error);
    return '';
  }
};

const referencedPhraseListNoteIds = async (): Promise<Set<string>> => {
  const values = await joplin.settings.values(STYLECHECK_EXTRA_NOTE_SETTING_KEYS);
  return new Set(STYLECHECK_EXTRA_NOTE_SETTING_KEYS.map(key => extractJoplinNoteId(values[key])).filter(Boolean));
};

const getPlatform = async (): Promise<Platform> => {
  if (cachedPlatform) return cachedPlatform;
  try {
    const info = await joplin.versionInfo();
    cachedPlatform = info?.platform === 'mobile' ? 'mobile' : 'desktop';
  } catch (_error) {
    cachedPlatform = 'desktop';
  }
  return cachedPlatform;
};

const getZenSettings = async (): Promise<ZenSettings> => {
  const keys = [
    SETTING_ENABLED, SETTING_ANALYSIS_ENABLED, SETTING_OPACITY, SETTING_WIDTH, SETTING_CENTER, SETTING_FOCUS_UNIT,
    SETTING_FONT_FAMILY, SETTING_FONT_SIZE, SETTING_CENTER_OFFSET, SETTING_TEXT_COLOR, SETTING_BACKGROUND_COLOR,
    SETTING_SYNTAX_HIGHLIGHT_ENABLED, SETTING_SYNTAX_HIGHLIGHT_ADJECTIVES, SETTING_SYNTAX_HIGHLIGHT_NOUNS,
    SETTING_SYNTAX_HIGHLIGHT_ADVERBS, SETTING_SYNTAX_HIGHLIGHT_VERBS, SETTING_SYNTAX_HIGHLIGHT_CONJUNCTIONS,
    SETTING_SYNTAX_STYLE_MODE, SETTING_SYNTAX_COLOR_ADJECTIVE, SETTING_SYNTAX_COLOR_NOUN, SETTING_SYNTAX_COLOR_ADVERB,
    SETTING_SYNTAX_COLOR_VERB, SETTING_SYNTAX_COLOR_CONJUNCTION, SETTING_STYLECHECK_ENABLED, SETTING_STYLECHECK_FILLERS,
    SETTING_STYLECHECK_CLICHES, SETTING_STYLECHECK_REDUNDANCIES, SETTING_STYLECHECK_WEAK_PHRASES,
    SETTING_STYLECHECK_REPETITIONS, SETTING_STYLECHECK_STYLE_MODE, SETTING_STYLECHECK_COLOR_FILLERS,
    SETTING_STYLECHECK_COLOR_CLICHES, SETTING_STYLECHECK_COLOR_REDUNDANCIES, SETTING_STYLECHECK_COLOR_WEAK,
    SETTING_STYLECHECK_COLOR_CUSTOM, SETTING_STYLECHECK_COLOR_REPETITIONS, SETTING_STYLECHECK_TOOLTIPS_ENABLED,
    SETTING_STYLECHECK_LEGEND_ENABLED, SETTING_ANALYSIS_SCOPE, SETTING_STYLECHECK_EXTRA_FILLERS,
    SETTING_STYLECHECK_EXTRA_CLICHES, SETTING_STYLECHECK_EXTRA_REDUNDANCIES, SETTING_STYLECHECK_EXTRA_WEAK_PHRASES,
    SETTING_STYLECHECK_CUSTOM_PATTERNS,
  ];
  const values = await joplin.settings.values(keys);
  const [styleCheckExtraFillers, styleCheckExtraCliches, styleCheckExtraRedundancies, styleCheckExtraWeakPhrases] = await Promise.all([
    phraseListFromNoteReference(values[SETTING_STYLECHECK_EXTRA_FILLERS]),
    phraseListFromNoteReference(values[SETTING_STYLECHECK_EXTRA_CLICHES]),
    phraseListFromNoteReference(values[SETTING_STYLECHECK_EXTRA_REDUNDANCIES]),
    phraseListFromNoteReference(values[SETTING_STYLECHECK_EXTRA_WEAK_PHRASES]),
  ]);

  return {
    enabled: !!values[SETTING_ENABLED],
    analysisEnabled: values[SETTING_ANALYSIS_ENABLED] !== false,
    inactiveOpacity: clamp(Number(values[SETTING_OPACITY] ?? 35), 10, 85),
    contentWidthEm: clamp(Number(values[SETTING_WIDTH] ?? 46), 24, 80),
    centerCursor: values[SETTING_CENTER] !== false,
    focusUnit: clamp(Number(values[SETTING_FOCUS_UNIT] ?? 1), 1, 2),
    fontFamily: String(values[SETTING_FONT_FAMILY] ?? '').trim(),
    fontSizePx: clamp(Number(values[SETTING_FONT_SIZE] ?? 0), 0, 40),
    centerOffsetVh: clamp(Number(values[SETTING_CENTER_OFFSET] ?? 0), -30, 30),
    textColor: String(values[SETTING_TEXT_COLOR] ?? '').trim(),
    backgroundColor: String(values[SETTING_BACKGROUND_COLOR] ?? '').trim(),
    platform: await getPlatform(),
    syntaxHighlightEnabled: values[SETTING_SYNTAX_HIGHLIGHT_ENABLED] !== false,
    syntaxHighlightAdjectives: values[SETTING_SYNTAX_HIGHLIGHT_ADJECTIVES] !== false,
    syntaxHighlightNouns: values[SETTING_SYNTAX_HIGHLIGHT_NOUNS] !== false,
    syntaxHighlightAdverbs: values[SETTING_SYNTAX_HIGHLIGHT_ADVERBS] !== false,
    syntaxHighlightVerbs: values[SETTING_SYNTAX_HIGHLIGHT_VERBS] !== false,
    syntaxHighlightConjunctions: values[SETTING_SYNTAX_HIGHLIGHT_CONJUNCTIONS] !== false,
    syntaxStyleMode: clamp(Number(values[SETTING_SYNTAX_STYLE_MODE] ?? 1), 1, 3),
    syntaxColorAdjective: String(values[SETTING_SYNTAX_COLOR_ADJECTIVE] ?? '#a87a3b').trim() || '#a87a3b',
    syntaxColorNoun: String(values[SETTING_SYNTAX_COLOR_NOUN] ?? '#cf5c57').trim() || '#cf5c57',
    syntaxColorAdverb: String(values[SETTING_SYNTAX_COLOR_ADVERB] ?? '#8c63d9').trim() || '#8c63d9',
    syntaxColorVerb: String(values[SETTING_SYNTAX_COLOR_VERB] ?? '#4b86d9').trim() || '#4b86d9',
    syntaxColorConjunction: String(values[SETTING_SYNTAX_COLOR_CONJUNCTION] ?? '#49a66a').trim() || '#49a66a',
    styleCheckEnabled: !!values[SETTING_STYLECHECK_ENABLED],
    styleCheckFillers: values[SETTING_STYLECHECK_FILLERS] !== false,
    styleCheckCliches: values[SETTING_STYLECHECK_CLICHES] !== false,
    styleCheckRedundancies: values[SETTING_STYLECHECK_REDUNDANCIES] !== false,
    styleCheckWeakPhrases: values[SETTING_STYLECHECK_WEAK_PHRASES] !== false,
    styleCheckRepetitions: values[SETTING_STYLECHECK_REPETITIONS] !== false,
    styleCheckStyleMode: clamp(Number(values[SETTING_STYLECHECK_STYLE_MODE] ?? 1), 1, 3),
    styleCheckColorFillers: String(values[SETTING_STYLECHECK_COLOR_FILLERS] ?? '#e9b552').trim() || '#e9b552',
    styleCheckColorCliches: String(values[SETTING_STYLECHECK_COLOR_CLICHES] ?? '#e76262').trim() || '#e76262',
    styleCheckColorRedundancies: String(values[SETTING_STYLECHECK_COLOR_REDUNDANCIES] ?? '#e79662').trim() || '#e79662',
    styleCheckColorWeak: String(values[SETTING_STYLECHECK_COLOR_WEAK] ?? '#6eaaf0').trim() || '#6eaaf0',
    styleCheckColorCustom: String(values[SETTING_STYLECHECK_COLOR_CUSTOM] ?? '#6eaaf0').trim() || '#6eaaf0',
    styleCheckColorRepetitions: String(values[SETTING_STYLECHECK_COLOR_REPETITIONS] ?? '#d96ee0').trim() || '#d96ee0',
    styleCheckTooltipsEnabled: values[SETTING_STYLECHECK_TOOLTIPS_ENABLED] !== false,
    styleCheckLegendEnabled: values[SETTING_STYLECHECK_LEGEND_ENABLED] !== false,
    analysisScope: clamp(Number(values[SETTING_ANALYSIS_SCOPE] ?? 1), 1, 2),
    styleCheckExtraFillers, styleCheckExtraCliches, styleCheckExtraRedundancies, styleCheckExtraWeakPhrases,
    styleCheckCustomPatterns: String(values[SETTING_STYLECHECK_CUSTOM_PATTERNS] ?? ''),
  };
};

const pushSettingsToEditor = async (settings: ZenSettings, attemptCount = 8) => {
  const serial = ++updateRetrySerial;
  for (let attempt = 0; attempt < attemptCount; attempt++) {
    if (serial !== updateRetrySerial) return;
    try {
      await joplin.commands.execute('editor.execCommand', { name: 'joplinZen__applySettings', args: [settings] });
      return;
    } catch (_error) {
      if (attempt === attemptCount - 1) return;
      await sleep(100);
    }
  }
};

const setZenEnabled = async (enabled: boolean) => {
  const current = await getZenSettings();
  const nextSettings = { ...current, enabled };
  if (current.enabled !== enabled) await joplin.settings.setValue(SETTING_ENABLED, enabled);
  await pushSettingsToEditor(nextSettings);
};

const sBool = (value: boolean, label: string, description?: string) => ({ section: SECTION, value, public: true, type: SettingItemType.Bool, label, description });
const sString = (value: string, label: string, description?: string) => ({ section: SECTION, value, public: true, type: SettingItemType.String, label, description });
const sInt = (value: number, label: string, minimum?: number, maximum?: number, step = 1, description?: string) => ({ section: SECTION, value, public: true, type: SettingItemType.Int, label, minimum, maximum, step, description });

const registerSettings = async () => {
  await joplin.settings.registerSection(SECTION, {
    label: 'Zen Mode',
    description: 'Focused writing mode with optional syntax highlighting and style checks.',
    iconName: 'fas fa-moon',
  });
  await joplin.settings.registerSettings({
    [SETTING_ENABLED]: { section: SECTION, value: false, public: false, type: SettingItemType.Bool, label: 'Zen mode enabled' },
    [SETTING_ANALYSIS_ENABLED]: { section: SECTION, value: true, public: false, type: SettingItemType.Bool, label: 'Zen analysis enabled' },
    [SETTING_DEFAULT_PHRASE_NOTES_CREATED]: { section: SECTION, value: false, public: false, type: SettingItemType.Bool, label: 'Default phrase-list notes created' },
    [SETTING_FOCUS_UNIT]: { section: SECTION, value: 1, public: true, type: SettingItemType.Int, label: 'Focus mode', isEnum: true, options: { 1: 'Paragraph', 2: 'Sentence' } },
    [SETTING_OPACITY]: sInt(35, 'Inactive text opacity (%)', 10, 85),
    [SETTING_WIDTH]: sInt(46, 'Content width (em)', 24, 80),
    [SETTING_CENTER]: sBool(true, 'Keep the cursor vertically centered'),
    [SETTING_FONT_FAMILY]: sString('iMWritingDuo Nerd Font', 'Font family override', 'Default: bundled iMWritingDuo Nerd Font. Type another installed font family name here to override it, or clear this field to keep the editor/theme font.'),
    [SETTING_FONT_SIZE]: sInt(0, 'Font size override (px)', 0, 40, 1, 'Set to 0 to keep the editor font size.'),
    [SETTING_CENTER_OFFSET]: sInt(0, 'Vertical offset from center (vh)', -30, 30),
    [SETTING_TEXT_COLOR]: sString('', 'Text color override', 'Leave empty to keep the theme text color.'),
    [SETTING_BACKGROUND_COLOR]: sString('', 'Background color override', 'Leave empty to keep the theme background color.'),
    [SETTING_SYNTAX_HIGHLIGHT_ENABLED]: sBool(true, 'Enable syntax highlight'),
    [SETTING_SYNTAX_HIGHLIGHT_ADJECTIVES]: sBool(true, 'Syntax highlight: adjectives (default brown)'),
    [SETTING_SYNTAX_HIGHLIGHT_NOUNS]: sBool(true, 'Syntax highlight: nouns (default red)'),
    [SETTING_SYNTAX_HIGHLIGHT_ADVERBS]: sBool(true, 'Syntax highlight: adverbs (default purple)'),
    [SETTING_SYNTAX_HIGHLIGHT_VERBS]: sBool(true, 'Syntax highlight: verbs (default blue)'),
    [SETTING_SYNTAX_HIGHLIGHT_CONJUNCTIONS]: sBool(true, 'Syntax highlight: conjunctions (default green)'),
    [SETTING_SYNTAX_STYLE_MODE]: { section: SECTION, value: 1, public: true, type: SettingItemType.Int, label: 'Syntax highlight style', isEnum: true, options: { 1: 'Color', 2: 'Underline', 3: 'Subtle background' } },
    [SETTING_SYNTAX_COLOR_ADJECTIVE]: sString('#a87a3b', 'Syntax color box: adjectives'),
    [SETTING_SYNTAX_COLOR_NOUN]: sString('#cf5c57', 'Syntax color box: nouns'),
    [SETTING_SYNTAX_COLOR_ADVERB]: sString('#8c63d9', 'Syntax color box: adverbs'),
    [SETTING_SYNTAX_COLOR_VERB]: sString('#4b86d9', 'Syntax color box: verbs'),
    [SETTING_SYNTAX_COLOR_CONJUNCTION]: sString('#49a66a', 'Syntax color box: conjunctions'),
    [SETTING_STYLECHECK_ENABLED]: sBool(false, 'Enable style check'),
    [SETTING_STYLECHECK_FILLERS]: sBool(true, 'Style check: fillers'),
    [SETTING_STYLECHECK_CLICHES]: sBool(true, 'Style check: clichés'),
    [SETTING_STYLECHECK_REDUNDANCIES]: sBool(true, 'Style check: redundancies'),
    [SETTING_STYLECHECK_WEAK_PHRASES]: sBool(true, 'Style check: weak phrases'),
    [SETTING_STYLECHECK_REPETITIONS]: sBool(true, 'Style check: repeated adjectives / verbs / adverbs'),
    [SETTING_STYLECHECK_STYLE_MODE]: { section: SECTION, value: 1, public: true, type: SettingItemType.Int, label: 'Style check mark style', isEnum: true, options: { 1: 'Strikethrough', 2: 'Dotted underline', 3: 'Wavy underline' } },
    [SETTING_STYLECHECK_COLOR_FILLERS]: sString('#e9b552', 'Style color box: fillers'),
    [SETTING_STYLECHECK_COLOR_CLICHES]: sString('#e76262', 'Style color box: clichés'),
    [SETTING_STYLECHECK_COLOR_REDUNDANCIES]: sString('#e79662', 'Style color box: redundancies'),
    [SETTING_STYLECHECK_COLOR_WEAK]: sString('#6eaaf0', 'Style color box: weak phrases'),
    [SETTING_STYLECHECK_COLOR_REPETITIONS]: sString('#d96ee0', 'Style color box: repeated adjectives / verbs'),
    [SETTING_STYLECHECK_COLOR_CUSTOM]: sString('#6eaaf0', 'Style color box: custom patterns'),
    [SETTING_STYLECHECK_TOOLTIPS_ENABLED]: sBool(true, 'Show style-check hover explanations', 'Desktop hover tooltips explain why a style-check item was flagged.'),
    [SETTING_STYLECHECK_LEGEND_ENABLED]: sBool(true, 'Show style-check legend in Zen mode', 'Shows a small fading legend using the same marks/colors as style checks.'),
    [SETTING_ANALYSIS_SCOPE]: { section: SECTION, value: 1, public: true, type: SettingItemType.Int, label: 'Desktop analysis scope', description: 'Full note is most complete. Visible text only is lighter and refreshes shortly after scrolling.', isEnum: true, options: { 1: 'Full note on desktop', 2: 'Visible text only' } },
    [SETTING_STYLECHECK_EXTRA_FILLERS]: sString('', 'Extra fillers note link or ID', 'Paste an internal Joplin note link or a 32-character note ID. The linked note is read as one phrase per line. Blank lines, Markdown headings, and Markdown list markers are ignored.'),
    [SETTING_STYLECHECK_EXTRA_CLICHES]: sString('', 'Extra clichés note link or ID', 'Paste an internal Joplin note link or a 32-character note ID. The linked note is read as one phrase per line. Blank lines, Markdown headings, and Markdown list markers are ignored.'),
    [SETTING_STYLECHECK_EXTRA_REDUNDANCIES]: sString('', 'Extra redundancies note link or ID', 'Paste an internal Joplin note link or a 32-character note ID. The linked note is read as one phrase per line. Blank lines, Markdown headings, and Markdown list markers are ignored.'),
    [SETTING_STYLECHECK_EXTRA_WEAK_PHRASES]: sString('', 'Extra weak phrases note link or ID', 'Paste an internal Joplin note link or a 32-character note ID. The linked note is read as one phrase per line. Blank lines, Markdown headings, and Markdown list markers are ignored.'),
    [SETTING_STYLECHECK_CUSTOM_PATTERNS]: sString('', 'Style check: custom patterns / exceptions', 'One rule per line. Prefix a line with - to add an exception. Regex rules are supported as /pattern/.'),
  });
};


const showInfo = async (message: string) => {
  try {
    await joplin.views.dialogs.showToast({ message, type: 'info', duration: 6000 });
  } catch (_error) {
    try { await joplin.views.dialogs.showMessageBox(message); } catch (_error2) { console.info(message); }
  }
};

const createDefaultPhraseListNotes = async (force = false) => {
  const values = await joplin.settings.values([SETTING_DEFAULT_PHRASE_NOTES_CREATED, ...STYLECHECK_EXTRA_NOTE_SETTING_KEYS]);
  const alreadyCreated = !!values[SETTING_DEFAULT_PHRASE_NOTES_CREATED];
  const allEmpty = STYLECHECK_EXTRA_NOTE_SETTING_KEYS.every(key => !String(values[key] ?? '').trim());
  if (!force && (alreadyCreated || !allEmpty)) return;

  let parent_id = '';
  try { parent_id = String((await joplin.workspace.selectedFolder())?.id ?? ''); } catch (_error) { parent_id = ''; }
  const createdTitles: string[] = [];

  for (const def of PHRASE_NOTE_SETTINGS) {
    const existing = String(values[def.key] ?? '').trim();
    if (!force && existing) continue;
    const body: any = { title: def.title, body: def.seed };
    if (parent_id) body.parent_id = parent_id;
    const note = await joplin.data.post(['notes'], null, body);
    await joplin.settings.setValue(def.key, note.id);
    createdTitles.push(def.title);
  }

  await joplin.settings.setValue(SETTING_DEFAULT_PHRASE_NOTES_CREATED, true);
  cachedPhraseListNoteIds = await referencedPhraseListNoteIds();
  if (createdTitles.length) {
    await showInfo(`Zen Mode created default phrase-list notes in the current notebook: ${createdTitles.join(', ')}. You can move them anywhere; the plugin stores their note IDs.`);
  }
};

const getSelectedEditorText = async (): Promise<string> => {
  try {
    return String(await joplin.commands.execute('editor.execCommand', { name: 'joplinZen__getSelection', args: [] }) ?? '').trim();
  } catch (_error) {
    return '';
  }
};

const appendSelectionToPhraseNote = async (settingKey: string, label: string) => {
  const selected = (await getSelectedEditorText()).replace(/\s+/g, ' ').trim();
  if (!selected) {
    await showInfo('Select a word or phrase in the editor first, then use the Zen Mode context-menu command.');
    return;
  }
  const settingValue = await joplin.settings.value(settingKey);
  const noteId = extractJoplinNoteId(settingValue);
  if (!noteId) {
    await showInfo(`No ${label} phrase-list note is configured yet. Use “Create default phrase-list notes” first or paste a note ID/link in settings.`);
    return;
  }
  const note = await joplin.data.get(['notes', noteId], { fields: ['id', 'title', 'body'] });
  const body = String(note?.body ?? '');
  const existing = normalisePhraseListNoteBody(body).split(/\n/g).map(line => line.trim().toLowerCase()).filter(Boolean);
  if (existing.includes(selected.toLowerCase())) {
    await showInfo(`“${selected}” is already in the ${label} phrase-list note.`);
    return;
  }
  const nextBody = `${body.replace(/\s*$/g, '')}\n${selected}\n`;
  await joplin.data.put(['notes', noteId], null, { body: nextBody });
  await showInfo(`Added “${selected}” to the ${label} phrase-list note.`);
};

const registerContentScript = async () => {
  await joplin.contentScripts.onMessage(CONTENT_SCRIPT_ID, async (message: any) => {
    try { if (message === 'getSettings') return await getZenSettings(); } catch (_error) { return await getZenSettings(); }
    return null;
  });
  await joplin.contentScripts.register(ContentScriptType.CodeMirrorPlugin, CONTENT_SCRIPT_ID, './contentScripts/codeMirror6.js');
};

const registerCommands = async () => {
  await joplin.commands.register({
    name: CMD_TOGGLE, label: 'Toggle Zen mode', iconName: 'fas fa-moon', enabledCondition: 'oneNoteSelected && markdownEditorVisible',
    execute: async () => { const settings = await getZenSettings(); await setZenEnabled(!settings.enabled); },
  });
  await joplin.commands.register({ name: CMD_ENABLE, label: 'Enable Zen mode', enabledCondition: 'oneNoteSelected && markdownEditorVisible', execute: async () => setZenEnabled(true) });
  await joplin.commands.register({ name: CMD_DISABLE, label: 'Disable Zen mode', enabledCondition: 'oneNoteSelected && markdownEditorVisible', execute: async () => setZenEnabled(false) });
  await joplin.commands.register({
    name: CMD_TOGGLE_ANALYSIS, label: 'Toggle Zen syntax/style matching', enabledCondition: 'oneNoteSelected && markdownEditorVisible',
    execute: async () => { const settings = await getZenSettings(); await joplin.settings.setValue(SETTING_ANALYSIS_ENABLED, !settings.analysisEnabled); await pushSettingsToEditor({ ...settings, analysisEnabled: !settings.analysisEnabled }); },
  });

  await joplin.commands.register({
    name: CMD_CREATE_PHRASE_NOTES,
    label: 'Create default Zen phrase-list notes',
    execute: async () => { await createDefaultPhraseListNotes(true); await pushSettingsToEditor(await getZenSettings()); },
  });

  await joplin.commands.register({ name: CMD_ADD_SELECTION_FILLER, label: 'Zen: Add selection to fillers note', enabledCondition: 'oneNoteSelected && markdownEditorVisible', execute: async () => appendSelectionToPhraseNote(SETTING_STYLECHECK_EXTRA_FILLERS, 'fillers') });
  await joplin.commands.register({ name: CMD_ADD_SELECTION_CLICHE, label: 'Zen: Add selection to clichés note', enabledCondition: 'oneNoteSelected && markdownEditorVisible', execute: async () => appendSelectionToPhraseNote(SETTING_STYLECHECK_EXTRA_CLICHES, 'clichés') });
  await joplin.commands.register({ name: CMD_ADD_SELECTION_REDUNDANCY, label: 'Zen: Add selection to redundancies note', enabledCondition: 'oneNoteSelected && markdownEditorVisible', execute: async () => appendSelectionToPhraseNote(SETTING_STYLECHECK_EXTRA_REDUNDANCIES, 'redundancies') });
  await joplin.commands.register({ name: CMD_ADD_SELECTION_WEAK, label: 'Zen: Add selection to weak phrases note', enabledCondition: 'oneNoteSelected && markdownEditorVisible', execute: async () => appendSelectionToPhraseNote(SETTING_STYLECHECK_EXTRA_WEAK_PHRASES, 'weak phrases') });

  await joplin.views.toolbarButtons.create(`${PLUGIN_ID}.toolbarButton`, CMD_TOGGLE, ToolbarButtonLocation.NoteToolbar);
  for (const [id, command, options] of [[`${PLUGIN_ID}.toggleMenuItem`, CMD_TOGGLE, { accelerator: 'Ctrl+Shift+Z' }], [`${PLUGIN_ID}.toggleAnalysisMenuItem`, CMD_TOGGLE_ANALYSIS, { accelerator: 'Ctrl+Alt+M' }]] as any[]) {
    try { await joplin.views.menuItems.create(id, command, MenuItemLocation.View, options); } catch (_error) { try { await joplin.views.menuItems.create(id, command, MenuItemLocation.View); } catch (_error2) {} }
  }
  try { await joplin.views.menuItems.create(`${PLUGIN_ID}.createPhraseNotesMenuItem`, CMD_CREATE_PHRASE_NOTES, MenuItemLocation.Tools); } catch (_error) {}
  try { await joplin.views.menuItems.create(`${PLUGIN_ID}.toggleAnalysisEditorContext`, CMD_TOGGLE_ANALYSIS, MenuItemLocation.EditorContextMenu); } catch (_error) {}
  try { await joplin.views.menuItems.create(`${PLUGIN_ID}.addSelectionFillerContext`, CMD_ADD_SELECTION_FILLER, MenuItemLocation.EditorContextMenu); } catch (_error) {}
  try { await joplin.views.menuItems.create(`${PLUGIN_ID}.addSelectionClicheContext`, CMD_ADD_SELECTION_CLICHE, MenuItemLocation.EditorContextMenu); } catch (_error) {}
  try { await joplin.views.menuItems.create(`${PLUGIN_ID}.addSelectionRedundancyContext`, CMD_ADD_SELECTION_REDUNDANCY, MenuItemLocation.EditorContextMenu); } catch (_error) {}
  try { await joplin.views.menuItems.create(`${PLUGIN_ID}.addSelectionWeakContext`, CMD_ADD_SELECTION_WEAK, MenuItemLocation.EditorContextMenu); } catch (_error) {}
};

joplin.plugins.register({
  onStart: async function() {
    await registerSettings();
    await registerContentScript();
    await registerCommands();
    await createDefaultPhraseListNotes(false);
    cachedPhraseListNoteIds = await referencedPhraseListNoteIds();
    await joplin.settings.onChange(async () => {
      cachedPhraseListNoteIds = await referencedPhraseListNoteIds();
      await pushSettingsToEditor(await getZenSettings());
    });
    await joplin.workspace.onNoteChange(async (event: any) => {
      if (!cachedPhraseListNoteIds.has(String(event?.id ?? '').toLowerCase())) return;
      if (phraseListRefreshTimer) clearTimeout(phraseListRefreshTimer);
      phraseListRefreshTimer = setTimeout(async () => {
        phraseListRefreshTimer = null;
        await pushSettingsToEditor(await getZenSettings());
      }, 250);
    });
    await pushSettingsToEditor(await getZenSettings());
  },
});
