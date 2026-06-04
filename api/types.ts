export enum ContentScriptType {
  MarkdownItPlugin = 'markdownItPlugin',
  CodeMirrorPlugin = 'codeMirrorPlugin',
}
export enum MenuItemLocation {
  File = 'file',
  Edit = 'edit',
  View = 'view',
  Note = 'note',
  Tools = 'tools',
  Help = 'help',
  Context = 'context',
  NoteListContextMenu = 'noteListContextMenu',
  EditorContextMenu = 'editorContextMenu',
  FolderContextMenu = 'folderContextMenu',
  TagContextMenu = 'tagContextMenu',
}
export enum SettingItemType {
  Int = 1,
  String = 2,
  Bool = 3,
  Array = 4,
  Object = 5,
  Button = 6,
}
export enum ToolbarButtonLocation {
  NoteToolbar = 'noteToolbar',
  EditorToolbar = 'editorToolbar',
}
