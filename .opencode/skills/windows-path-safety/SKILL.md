---
name: windows-path-safety
description: Prevents Windows file system pitfalls such as accidental @nul file creation from reserved device names. Use when performing any file operations on Windows — reading, writing, globbing, or constructing paths dynamically.
license: MIT
metadata:
  author: local
  version: "1.0.0"
---

# Windows Path Safety

Use this skill whenever performing file system operations on Windows.

## Apply it for

- Reading or writing files with the Read/Write tools
- Constructing file paths dynamically
- Debugging unexpected `@nul` or empty file artifacts
- Any bash/PowerShell file system commands

## The Core Problem: Reserved Device Names

Windows reserves certain names at any path level: `nul`, `con`, `prn`, `aux`, `com1`–`com9`, `lpt1`–`lpt9`.

When the Read tool is called with a path ending in `\nul` (e.g. because a directory does not exist and the path resolves incorrectly), Windows creates an `@nul` artifact file in the working directory instead of throwing a clean error.

**Example of what goes wrong:**

```
Read(filePath: "C:\project\src\components\checkout\nul")
→ creates @nul file in project root
```

## Rules to Follow

### 1. Verify paths exist with Glob BEFORE calling Read

```
// Always do this first
glob("src/components/checkout/**/*")
// Only call Read if results are returned
```

### 2. Never construct paths that may not exist

If a path is uncertain, use Glob to discover the real path rather than guessing and calling Read directly.

### 3. Use forward slashes in constructed paths

Forward slashes work on Windows and avoid accidental escape issues:

```
// Preferred
"src/components/button.tsx"

// Risky — \n, \t etc. can be misinterpreted
"src\components\button.tsx"
```

### 4. Check existence in PowerShell before file ops

```powershell
if (Test-Path "path/to/file") {
  # safe to proceed
}
```

## Prevention Checklist

Before any file read/write:

- [ ] Used Glob first to confirm the path exists
- [ ] Path does not end with a reserved name (`nul`, `con`, `prn`, etc.)
- [ ] Using forward slashes or properly escaped backslashes
- [ ] Not guessing paths — derived from actual Glob results

## Quick Reference: Reserved Names to Avoid as Path Segments

`nul` `con` `prn` `aux` `com1` `com2` `com3` `com4` `com5` `com6` `com7` `com8` `com9` `lpt1` `lpt2` `lpt3` `lpt4` `lpt5` `lpt6` `lpt7` `lpt8` `lpt9`
