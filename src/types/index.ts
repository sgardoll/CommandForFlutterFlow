/**
 * Code types for FlutterFlow custom code files
 */
export enum CodeType {
  WIDGET = 'WIDGET',
  ACTION = 'ACTION',
  FUNCTION = 'FUNCTION',
  OTHER = 'OTHER',
  DEPENDENCIES = 'DEPENDENCIES',
}

/**
 * Represents a file in the FlutterFlow custom code directory
 */
export interface FileInfo {
  filePath: string;
  codeType: CodeType;
  relativePath: string;
  baseName: string;
  isDeleted: boolean;
  isModified: boolean;
  lastModified: number;
  content?: string;
}

/**
 * Map of file keys to FileInfo
 * For WIDGET, ACTION, FUNCTION: key is baseName (e.g., "my_widget.dart")
 * For OTHER: key is relativePath (e.g., "subdir/my_file.dart")
 * For DEPENDENCIES: key is baseName
 */
export type FileMap = Map<string, FileInfo>;

/**
 * Result of a file operation
 */
export interface FileOperationResult {
  success: boolean;
  fileInfo?: FileInfo;
  error?: string;
}
