# FileBrowser

`FileBrowser` is _mini_ File System browser for Scriptable which can be used to:

* browse the local file system<sup>1</sup>
* browse iCloud folders<sup>1</sup>
* browse bookmarked folders.

<sup>1</sup>*Files and folders accessible through the sandbox.*


**Example Usage:**
```javascript
const {FileBrowser} = importModule('file-browser')
const path = FileManager.local().documentsDirectory()
const browser = new FileBrowser(path)
const file = await browser.present()
```


**Download**

[DOWNLOAD](https://open.scriptable.app/run/Import-Script?url=https://github.com/supermamon/scriptable-file-browser/file-browser.js) using [Import-Script](https://github.com/supermamon/scriptable-scripts/tree/master/Import-Script) or copy the code from [file-browser.js](file-browser.js) and save in Scriptable.

![mockup of file browser with pointer finger at the screen](file-browser.jpg)


## Methods

--- 

### new FileBrowser

Construct a new FileBrowser.

```javascript
new FileBrowser(path, options)
```

#### Parameters

`path` : the directory to browse

`options` : a JSON value indicating the additional options to change the behaviour of the browser
- `canBrowseParent: Boolean`: allow browsing above the initial path. Useful for exploring outside the known directories. Default *false*.
- `precheckAccess: Boolean`: while listing directory contents, check each sub-directory is accessible or not. Inaccessible directories will be colored in red. Default *true*.
- `fullscreen: Boolean`: open the file browser in fullscreen. Default *true*.

---

### -present

Launches the file browser returns a JSON value containing information about the selected file

```javascript
present(): Promise<FileInfo>
````

---

### -previewFile

opens a QuickLook onthe file. `path` is the path to the file. `FileBrowser` will try to auto-detect images and present the image itself. Any other file will be treated as a text file. If it is unable to read the file contents, it will show `<eof>`.

```javascript
previewFile(path:String)
```

---

### +pickScriptableDirectory

Presents a list of built-in directories that Scriptable has access to. Choosing any of them will return the path to that directory.

```javascript
pickScriptableDirectory(): String
```

## Properties

--- 

### canBrowseParent

Allow browsing above the inital path. Useful for exploring outside the known directories.

```javascript
canBrowseParent: Boolean
```
---

### fullscreen

Open the file browser in full screen.

```javascript
fullscreen: Boolean
```

--- 

### path

The initial path to use when the FileBrowser is presented. By default, navigating to the parent directory of this folder is not allowed. Pass the `canBrowseParent` option to override.

```javascript
path: String
```

--- 

### precheckAccess

Test and colorized inaccessible sub-directories.

```javascript
precheckAccess: Boolean
```

--- 

### pwd

The current directory being displayed.

```javascript
pwd: String
```

## Examples

### Browse a bookmarked path

```javascript
const path = FileManager.bookmarkedPath('Shortcuts')
const browser = new FileBrowser(path)
const file = await browser.present()
```

### Open a specific folder

```javascript
const {FileBrowser} = importModule('file-browser')
const path = '/Developer'
const browser = new FileBrowser(path)
const file = await browser.present()
```

### Disable access precheck

```javascript
const {FileBrowser} = importModule('file-browser')
const path = '/Developer'
const browser = new FileBrowser(path, {precheckAccess:false})
const file = await browser.present()
```

![tracking pixel](https://lynks.cc/ghfilebrowser/track)


