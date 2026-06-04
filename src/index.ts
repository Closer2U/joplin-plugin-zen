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
const SETTING_STYLECHECK_EXTRA_FILLERS = 'styleCheckExtraFillers';
const SETTING_STYLECHECK_EXTRA_CLICHES = 'styleCheckExtraCliches';
const SETTING_STYLECHECK_EXTRA_REDUNDANCIES = 'styleCheckExtraRedundancies';
const SETTING_STYLECHECK_EXTRA_WEAK_PHRASES = 'styleCheckExtraWeakPhrases';
const SETTING_STYLECHECK_CUSTOM_PATTERNS = 'styleCheckCustomPatterns';

let updateRetrySerial = 0;
let cachedPlatform: Platform | null = null;

const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  const values = await joplin.settings.values([
    SETTING_ENABLED,
    SETTING_ANALYSIS_ENABLED,
    SETTING_OPACITY,
    SETTING_WIDTH,
    SETTING_CENTER,
    SETTING_FOCUS_UNIT,
    SETTING_FONT_FAMILY,
    SETTING_FONT_SIZE,
    SETTING_CENTER_OFFSET,
    SETTING_TEXT_COLOR,
    SETTING_BACKGROUND_COLOR,
    SETTING_SYNTAX_HIGHLIGHT_ENABLED,
    SETTING_SYNTAX_HIGHLIGHT_ADJECTIVES,
    SETTING_SYNTAX_HIGHLIGHT_NOUNS,
    SETTING_SYNTAX_HIGHLIGHT_ADVERBS,
    SETTING_SYNTAX_HIGHLIGHT_VERBS,
    SETTING_SYNTAX_HIGHLIGHT_CONJUNCTIONS,
    SETTING_SYNTAX_STYLE_MODE,
    SETTING_SYNTAX_COLOR_ADJECTIVE,
    SETTING_SYNTAX_COLOR_NOUN,
    SETTING_SYNTAX_COLOR_ADVERB,
    SETTING_SYNTAX_COLOR_VERB,
    SETTING_SYNTAX_COLOR_CONJUNCTION,
    SETTING_STYLECHECK_ENABLED,
    SETTING_STYLECHECK_FILLERS,
    SETTING_STYLECHECK_CLICHES,
    SETTING_STYLECHECK_REDUNDANCIES,
    SETTING_STYLECHECK_WEAK_PHRASES,
    SETTING_STYLECHECK_REPETITIONS,
    SETTING_STYLECHECK_STYLE_MODE,
    SETTING_STYLECHECK_COLOR_FILLERS,
    SETTING_STYLECHECK_COLOR_CLICHES,
    SETTING_STYLECHECK_COLOR_REDUNDANCIES,
    SETTING_STYLECHECK_COLOR_WEAK,
    SETTING_STYLECHECK_COLOR_CUSTOM,
    SETTING_STYLECHECK_COLOR_REPETITIONS,
    SETTING_STYLECHECK_EXTRA_FILLERS,
    SETTING_STYLECHECK_EXTRA_CLICHES,
    SETTING_STYLECHECK_EXTRA_REDUNDANCIES,
    SETTING_STYLECHECK_EXTRA_WEAK_PHRASES,
    SETTING_STYLECHECK_CUSTOM_PATTERNS,
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
    styleCheckExtraFillers: String(values[SETTING_STYLECHECK_EXTRA_FILLERS] ?? ''),
    styleCheckExtraCliches: String(values[SETTING_STYLECHECK_EXTRA_CLICHES] ?? ''),
    styleCheckExtraRedundancies: String(values[SETTING_STYLECHECK_EXTRA_REDUNDANCIES] ?? ''),
    styleCheckExtraWeakPhrases: String(values[SETTING_STYLECHECK_EXTRA_WEAK_PHRASES] ?? ''),
    styleCheckCustomPatterns: String(values[SETTING_STYLECHECK_CUSTOM_PATTERNS] ?? ''),
  };
};

const pushSettingsToEditor = async (settings: ZenSettings, attemptCount = 8) => {
  const serial = ++updateRetrySerial;

  for (let attempt = 0; attempt < attemptCount; attempt++) {
    if (serial !== updateRetrySerial) return;

    try {
      await joplin.commands.execute('editor.execCommand', {
        name: 'joplinZen__applySettings',
        args: [settings],
      });
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

  if (current.enabled !== enabled) {
    await joplin.settings.setValue(SETTING_ENABLED, enabled);
  }

  await pushSettingsToEditor(nextSettings);
};

const registerSettings = async () => {
  await joplin.settings.registerSection(SECTION, {
    label: 'Zen Mode',
    description: 'Syntax legend: brown = adjectives, red = nouns, purple = adverbs, blue = verbs, green = conjunctions. Colors and mark styles below are customizable.',
    iconName: 'fas fa-moon',
  });

  await joplin.settings.registerSettings({
    [SETTING_ENABLED]: { section: SECTION, value: false, public: false, type: SettingItemType.Bool, label: 'Zen mode enabled' },
    [SETTING_ANALYSIS_ENABLED]: { section: SECTION, value: true, public: false, type: SettingItemType.Bool, label: 'Zen analysis enabled' },
    [SETTING_FOCUS_UNIT]: {
      section: SECTION,
      value: 1,
      public: true,
      type: SettingItemType.Int,
      label: 'Focus mode',
      isEnum: true,
      options: { 1: 'Paragraph', 2: 'Sentence' },
    },
    [SETTING_OPACITY]: { section: SECTION, value: 35, public: true, type: SettingItemType.Int, label: 'Inactive text opacity (%)', minimum: 10, maximum: 85, step: 1 },
    [SETTING_WIDTH]: { section: SECTION, value: 46, public: true, type: SettingItemType.Int, label: 'Content width (em)', minimum: 24, maximum: 80, step: 1 },
    [SETTING_CENTER]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Keep the cursor vertically centered' },
    [SETTING_FONT_FAMILY]: { section: SECTION, value: '', public: true, type: SettingItemType.String, label: 'Font family override', description: 'Leave empty to keep the editor font.' },
    [SETTING_FONT_SIZE]: { section: SECTION, value: 0, public: true, type: SettingItemType.Int, label: 'Font size override (px)', description: 'Set to 0 to keep the editor font size.', minimum: 0, maximum: 40, step: 1 },
    [SETTING_CENTER_OFFSET]: { section: SECTION, value: 0, public: true, type: SettingItemType.Int, label: 'Vertical offset from center (vh)', minimum: -30, maximum: 30, step: 1 },
    [SETTING_TEXT_COLOR]: { section: SECTION, value: '', public: true, type: SettingItemType.String, label: 'Text color override', description: 'Leave empty to keep the theme text color.' },
    [SETTING_BACKGROUND_COLOR]: { section: SECTION, value: '', public: true, type: SettingItemType.String, label: 'Background color override', description: 'Leave empty to keep the theme background color.' },

    [SETTING_SYNTAX_HIGHLIGHT_ENABLED]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Enable syntax highlight' },
    [SETTING_SYNTAX_HIGHLIGHT_ADJECTIVES]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Syntax highlight: adjectives (default brown)' },
    [SETTING_SYNTAX_HIGHLIGHT_NOUNS]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Syntax highlight: nouns (default red)' },
    [SETTING_SYNTAX_HIGHLIGHT_ADVERBS]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Syntax highlight: adverbs (default purple)' },
    [SETTING_SYNTAX_HIGHLIGHT_VERBS]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Syntax highlight: verbs (default blue)' },
    [SETTING_SYNTAX_HIGHLIGHT_CONJUNCTIONS]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Syntax highlight: conjunctions (default green)' },
    [SETTING_SYNTAX_STYLE_MODE]: {
      section: SECTION,
      value: 1,
      public: true,
      type: SettingItemType.Int,
      label: 'Syntax highlight style',
      isEnum: true,
      options: { 1: 'Color', 2: 'Underline', 3: 'Subtle background' },
    },
    [SETTING_SYNTAX_COLOR_ADJECTIVE]: { section: SECTION, value: '#a87a3b', public: true, type: SettingItemType.String, label: 'Syntax color box: adjectives' },
    [SETTING_SYNTAX_COLOR_NOUN]: { section: SECTION, value: '#cf5c57', public: true, type: SettingItemType.String, label: 'Syntax color box: nouns' },
    [SETTING_SYNTAX_COLOR_ADVERB]: { section: SECTION, value: '#8c63d9', public: true, type: SettingItemType.String, label: 'Syntax color box: adverbs' },
    [SETTING_SYNTAX_COLOR_VERB]: { section: SECTION, value: '#4b86d9', public: true, type: SettingItemType.String, label: 'Syntax color box: verbs' },
    [SETTING_SYNTAX_COLOR_CONJUNCTION]: { section: SECTION, value: '#49a66a', public: true, type: SettingItemType.String, label: 'Syntax color box: conjunctions' },

    [SETTING_STYLECHECK_ENABLED]: { section: SECTION, value: false, public: true, type: SettingItemType.Bool, label: 'Enable style check' },
    [SETTING_STYLECHECK_FILLERS]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Style check: fillers' },
    [SETTING_STYLECHECK_CLICHES]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Style check: clichés' },
    [SETTING_STYLECHECK_REDUNDANCIES]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Style check: redundancies' },
    [SETTING_STYLECHECK_WEAK_PHRASES]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Style check: weak phrases' },
    [SETTING_STYLECHECK_REPETITIONS]: { section: SECTION, value: true, public: true, type: SettingItemType.Bool, label: 'Style check: repeated adjectives / verbs / adverbs' },
    [SETTING_STYLECHECK_STYLE_MODE]: {
      section: SECTION,
      value: 1,
      public: true,
      type: SettingItemType.Int,
      label: 'Style check mark style',
      isEnum: true,
      options: { 1: 'Strikethrough', 2: 'Dotted underline', 3: 'Wavy underline' },
    },
    [SETTING_STYLECHECK_COLOR_FILLERS]: { section: SECTION, value: '#e9b552', public: true, type: SettingItemType.String, label: 'Style color box: fillers' },
    [SETTING_STYLECHECK_COLOR_CLICHES]: { section: SECTION, value: '#e76262', public: true, type: SettingItemType.String, label: 'Style color box: clichés' },
    [SETTING_STYLECHECK_COLOR_REDUNDANCIES]: { section: SECTION, value: '#e79662', public: true, type: SettingItemType.String, label: 'Style color box: redundancies' },
    [SETTING_STYLECHECK_COLOR_WEAK]: { section: SECTION, value: '#6eaaf0', public: true, type: SettingItemType.String, label: 'Style color box: weak phrases' },
    [SETTING_STYLECHECK_COLOR_REPETITIONS]: { section: SECTION, value: '#d96ee0', public: true, type: SettingItemType.String, label: 'Style color box: repeated adjectives / verbs' },
    [SETTING_STYLECHECK_COLOR_CUSTOM]: { section: SECTION, value: '#6eaaf0', public: true, type: SettingItemType.String, label: 'Style color box: custom patterns' },
    [SETTING_STYLECHECK_EXTRA_FILLERS]: { section: SECTION, value: '', public: true, type: SettingItemType.String, label: 'Extra fillers to flag', description: 'One phrase per line.' },
    [SETTING_STYLECHECK_EXTRA_CLICHES]: { section: SECTION, value: '', public: true, type: SettingItemType.String, label: 'Extra clichés to flag', description: 'One phrase per line.' },
    [SETTING_STYLECHECK_EXTRA_REDUNDANCIES]: { section: SECTION, value: '', public: true, type: SettingItemType.String, label: 'Extra redundancies to flag', description: 'One phrase per line.' },
    [SETTING_STYLECHECK_EXTRA_WEAK_PHRASES]: { section: SECTION, value: '', public: true, type: SettingItemType.String, label: 'Extra weak phrases to flag', description: 'One phrase per line.' },
    [SETTING_STYLECHECK_CUSTOM_PATTERNS]: {
      section: SECTION,
      value: '',
      public: true,
      type: SettingItemType.String,
      label: 'Style check: custom patterns / exceptions',
      description: 'One rule per line. Prefix a line with - to add an exception. Regex rules are supported as /pattern/.',
    },
  });
};

const registerContentScript = async () => {
  await joplin.contentScripts.onMessage(CONTENT_SCRIPT_ID, async (message: any) => {
    try {
      if (message === 'getSettings') return await getZenSettings();
    } catch (_error) {
      return await getZenSettings();
    }
    return null;
  });

  await joplin.contentScripts.register(ContentScriptType.CodeMirrorPlugin, CONTENT_SCRIPT_ID, './contentScripts/codeMirror6.js');
};

const registerCommands = async () => {
  await joplin.commands.register({
    name: CMD_TOGGLE,
    label: 'Toggle Zen mode',
    iconName: 'fas fa-moon',
    enabledCondition: 'oneNoteSelected && markdownEditorVisible',
    execute: async () => {
      const settings = await getZenSettings();
      await setZenEnabled(!settings.enabled);
    },
  });

  await joplin.commands.register({
    name: CMD_ENABLE,
    label: 'Enable Zen mode',
    enabledCondition: 'oneNoteSelected && markdownEditorVisible',
    execute: async () => {
      await setZenEnabled(true);
    },
  });

  await joplin.commands.register({
    name: CMD_DISABLE,
    label: 'Disable Zen mode',
    enabledCondition: 'oneNoteSelected && markdownEditorVisible',
    execute: async () => {
      await setZenEnabled(false);
    },
  });

  await joplin.commands.register({
    name: CMD_TOGGLE_ANALYSIS,
    label: 'Toggle Zen syntax/style matching',
    enabledCondition: 'oneNoteSelected && markdownEditorVisible',
    execute: async () => {
      const settings = await getZenSettings();
      await joplin.settings.setValue(SETTING_ANALYSIS_ENABLED, !settings.analysisEnabled);
      await pushSettingsToEditor({ ...settings, analysisEnabled: !settings.analysisEnabled });
    },
  });

  await joplin.views.toolbarButtons.create(`${PLUGIN_ID}.toolbarButton`, CMD_TOGGLE, ToolbarButtonLocation.NoteToolbar);

  try {
    await joplin.views.menuItems.create(`${PLUGIN_ID}.toggleMenuItem`, CMD_TOGGLE, MenuItemLocation.View, { accelerator: 'Ctrl+Shift+Z' });
  } catch (_error) {
    try {
      await joplin.views.menuItems.create(`${PLUGIN_ID}.toggleMenuItem`, CMD_TOGGLE, MenuItemLocation.View);
    } catch (_error2) {
      // Ignore missing menu location support.
    }
  }

  try {
    await joplin.views.menuItems.create(`${PLUGIN_ID}.toggleAnalysisMenuItem`, CMD_TOGGLE_ANALYSIS, MenuItemLocation.View, { accelerator: 'Ctrl+Alt+M' });
  } catch (_error) {
    try {
      await joplin.views.menuItems.create(`${PLUGIN_ID}.toggleAnalysisMenuItem`, CMD_TOGGLE_ANALYSIS, MenuItemLocation.View);
    } catch (_error2) {
      // Ignore missing menu location support.
    }
  }

  try {
    await joplin.views.menuItems.create(`${PLUGIN_ID}.toggleAnalysisEditorContext`, CMD_TOGGLE_ANALYSIS, MenuItemLocation.EditorContextMenu);
  } catch (_error) {
    // Ignore unsupported context menu locations.
  }
};

joplin.plugins.register({
  onStart: async function() {
    await registerSettings();
    await registerContentScript();
    await registerCommands();

    await joplin.settings.onChange(async () => {
      await pushSettingsToEditor(await getZenSettings());
    });

    await pushSettingsToEditor(await getZenSettings());
  },
});
