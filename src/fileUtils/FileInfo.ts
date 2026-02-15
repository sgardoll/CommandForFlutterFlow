import * as path from 'path';
import { FileInfo, CodeType } from '../types';

/**
 * Get the storage key for a file based on its code type
 * 
 * CRITICAL: Different code types use different keys in the file map:
 * - WIDGET, ACTION, FUNCTION, DEPENDENCIES: use baseName (e.g., "my_file.dart")
 * - OTHER: uses relativePath (e.g., "subdir/my_file.dart") to preserve directory structure
 */
export function getFileKey(filePath: string, codeType: CodeType, customCodeDir: string): string {
  if (codeType === CodeType.OTHER) {
    return getRelativePath(filePath, codeType, customCodeDir);
  }
  return path.basename(filePath);
}

/**
 * Get the relative path from the custom_code directory
 * 
 * FIX: Added support for CodeType.OTHER and CodeType.DEPENDENCIES
 * Previously threw "Unknown file type" error for OTHER files
 */
export function getRelativePath(filePath: string, codeType: CodeType, customCodeDir: string): string {
  const relativePath = path.relative(customCodeDir, filePath);
  
  switch (codeType) {
    case CodeType.WIDGET:
    case CodeType.ACTION:
    case CodeType.FUNCTION:
      return path.join(codeType.toLowerCase() + 's', path.basename(filePath));
    case CodeType.OTHER:
      return relativePath;
    case CodeType.DEPENDENCIES:
      return path.join('dependencies', path.basename(filePath));
    default:
      throw new Error(`Unknown file type: ${codeType}`);
  }
}

/**
 * Get the code type from a file path
 */
export function pathToCodeType(filePath: string): CodeType {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (normalizedPath.startsWith('widgets/')) {
    return CodeType.WIDGET;
  }
  if (normalizedPath.startsWith('actions/')) {
    return CodeType.ACTION;
  }
  if (normalizedPath.startsWith('functions/')) {
    return CodeType.FUNCTION;
  }
  if (normalizedPath.startsWith('dependencies/')) {
    return CodeType.DEPENDENCIES;
  }
  
  return CodeType.OTHER;
}

/**
 * Determine if a file is an index.dart file at the custom_code root
 */
export function isRootIndexFile(filePath: string, customCodeDir: string): boolean {
  const relativePath = path.relative(customCodeDir, filePath);
  return relativePath === 'index.dart' || relativePath === 'index.dart';
}

/**
 * Get list of modified files from the file map
 */
export function modifiedFiles(fileMap: Map<string, FileInfo>): FileInfo[] {
  return Array.from(fileMap.values()).filter(f => f.isModified);
}

/**
 * Get list of deleted files from the file map
 */
export function deletedFiles(fileMap: Map<string, FileInfo>): FileInfo[] {
  return Array.from(fileMap.values()).filter(f => f.isDeleted);
}
