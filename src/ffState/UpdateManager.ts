import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInfo, CodeType, FileMap } from '../types';
import { getFileKey, getRelativePath, pathToCodeType, isRootIndexFile, modifiedFiles, deletedFiles } from '../fileUtils/FileInfo';

export class UpdateManager {
  private customCodeDir: string;
  private fileMap: FileMap = new Map();

  constructor(customCodeDir: string) {
    this.customCodeDir = customCodeDir;
  }

  /**
   * FIX #4 & #5: Normalize path separators for cross-platform compatibility
   * Also filters out root-level index.dart files
   */
  private normalizePath(entry: string): string {
    return entry.replace(/\\/g, path.sep).replace(/\//g, path.sep);
  }

  /**
   * FIX #2: Use getFileKey to compute the correct lookup key based on code type
   * This ensures OTHER files use relativePath while others use baseName
   */
  private computeFileKey(filePath: string, codeType: CodeType): string {
    return getFileKey(filePath, codeType, this.customCodeDir);
  }

  /**
   * FIX #3: deleteFile now uses the correct key (relativePath for OTHER files)
   */
  async deleteFile(filePath: string): Promise<FileInfo | null> {
    const codeType = pathToCodeType(filePath);
    const fileKey = this.computeFileKey(filePath, codeType);
    const fileInfo = this.fileMap.get(fileKey);

    if (!fileInfo) {
      return null;
    }

    fileInfo.isDeleted = true;
    fileInfo.isModified = false;
    return fileInfo;
  }

  /**
   * FIX #4 & #5: updateFile now uses the correct key (relativePath for OTHER files)
   */
  async updateFile(filePath: string, content: string): Promise<FileInfo | null> {
    const codeType = pathToCodeType(filePath);
    const fileKey = this.computeFileKey(filePath, codeType);
    const fileInfo = this.fileMap.get(fileKey);

    if (!fileInfo) {
      return null;
    }

    fileInfo.content = content;
    fileInfo.isModified = true;
    fileInfo.isDeleted = false;
    fileInfo.lastModified = Date.now();
    return fileInfo;
  }

  /**
   * FIX #3: addFile now uses the correct key for existing-file check
   * Uses relativePath for OTHER files, baseName for others
   */
  async addFile(filePath: string, content?: string): Promise<FileInfo> {
    const codeType = pathToCodeType(filePath);
    const fileKey = this.computeFileKey(filePath, codeType);
    
    const existingFile = this.fileMap.get(fileKey);
    if (existingFile) {
      return existingFile;
    }

    const fileInfo: FileInfo = {
      filePath,
      codeType,
      relativePath: getRelativePath(filePath, codeType, this.customCodeDir),
      baseName: path.basename(filePath),
      isDeleted: false,
      isModified: false,
      lastModified: Date.now(),
      content,
    };

    this.fileMap.set(fileKey, fileInfo);
    return fileInfo;
  }

  /**
   * FIX #1: getRelativePath now handles CodeType.OTHER and CodeType.DEPENDENCIES
   * 
   * FIX #2: readdir now normalizes paths for cross-platform compatibility
   * and filters out index.dart files at the custom_code root
   */
  async computeFileMap(): Promise<FileMap> {
    this.fileMap.clear();

    try {
      const entries = await fs.readdir(this.customCodeDir, { recursive: true });
      
      if (!entries) {
        return this.fileMap;
      }

      for (const entry of entries) {
        if (typeof entry !== 'string') {
          continue;
        }

        const normalizedEntry = this.normalizePath(entry);
        
        if (normalizedEntry.startsWith('.') || !normalizedEntry.endsWith('.dart')) {
          continue;
        }

        const fullPath = path.join(this.customCodeDir, normalizedEntry);
        
        if (isRootIndexFile(fullPath, this.customCodeDir)) {
          continue;
        }

        try {
          const stats = await fs.stat(fullPath);
          if (stats.isFile()) {
            await this.addFile(fullPath);
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.error('Failed to compute file map:', error);
    }

    return this.fileMap;
  }

  getModifiedFiles(): FileInfo[] {
    return modifiedFiles(this.fileMap);
  }

  getDeletedFiles(): FileInfo[] {
    return deletedFiles(this.fileMap);
  }

  getFileInfo(filePath: string): FileInfo | undefined {
    const codeType = pathToCodeType(filePath);
    const fileKey = this.computeFileKey(filePath, codeType);
    return this.fileMap.get(fileKey);
  }
}
