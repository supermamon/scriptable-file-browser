# FileBrowser

`FileBrowser` is _mini_ File System browser for Scriptable which can be used to:

* browse the local file system<sup>1</sup>
* browse iCloud folders<sup>1</sup>
* browse bookmarked folders.

`FileBrowser` can be also used as a file picker for local directories.

<sup>1</sup>*Files and folders accessible through the sandbox. Jailbroken devices will be able to browse the whole file system.*


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
### +browse(path, options)

A static method with the same parametes as the constructor. This allows the caller to open the file browser by simply calling `FileBrowser.browse()`. If the `path` parameter is _null_, a list of predefined locations to choose from will be presented. Use this to explore the file system or just run the script itself.

```javascript
browse(): Promise<FileInfo>
````


### -present

Launches the file browser returns a JSON value containing information about the selected file. 

In version 1.1 a `pickFile` alias was introduced because technically, `FileBrowser` is a file picker. So, so it makes more sense to say `FileBrowser.picFile()`. 

```javascript
present(): Promise<FileInfo>
````

---

### -previewFile

_Deprecated. use FileBrowser.view() instead. Will be obsoleted on the next major version._ 

opens a QuickLook on the file. `path` is the path to the file. `FileBrowser` will try to auto-detect images and present the image itself. Any other file will be treated as a text file. If it is unable to read the file contents, it will show `<eof>`.

```javascript
previewFile(path:String)
```

---

### +pickScriptableDirectory

Presents a list of built-in directories that Scriptable has access to. Choosing any of them will return the path to that directory.

```javascript
pickScriptableDirectory(): String
```

---

### +view

Opens a QuickLook on the file. `path` is the path to the file. `FileBrowser` will try to auto-detect the file type and present with the suitable viewer. If it is unable to read the file contents, it will show `<unable to read contents>`.

```javascript
view(path:String)
```

---

### +viewImage

QuickLook on an image file. 

```javascript
viewImage(path:String)
```

---

### +viewText

Reads a file as text and presents via Quick Look.

```javascript
viewText(path:String)
```

---

### +viewJSON

Reads a file as text and parses as JSON. It is presented using Quick Look which allowed navigating around the structure.

```javascript
viewJSON(path:String)
```

---

### +viewPath

Passes the file path to the built-in `QuickLook.present()`. 

```javascript
viewPath(path:String)
```

---

### +viewOctet

Reads the file as `Data` bytes and converts bytes into a string and present via Quick Look. 

```javascript
viewOctet(path:String)
```

---

### +addViewer

Reads the file as `Data` bytes and converts bytes into a string and present via Quick Look. It accepts a JSON or a class which contains the `mimetype` and `view` keys.

```javascript
addViewer(viewer = {mimetype:String, view:Promise<function(path:String)>})
```

#### Parameters

`mimetype` : the mime type of the file that will be handled by the viewer. Example `image/jpeg`

`view` : a function that accepts a `path` to the file and presents it for viewing.


## Properties

--- 

### -canBrowseParent

Allow browsing above the inital path. Useful for exploring outside the known directories.

```javascript
canBrowseParent: Boolean
```
---

### -fullscreen

Open the file browser in full screen.

```javascript
fullscreen: Boolean
```

--- 

### -path

The initial path to use when the FileBrowser is presented. By default, navigating to the parent directory of this folder is not allowed. Pass the `canBrowseParent` option to override.

```javascript
path: String
```

--- 

### -precheckAccess

Test and colorized inaccessible sub-directories.

```javascript
precheckAccess: Boolean
```

--- 

### -pwd

The current directory being displayed.

```javascript
pwd: String
```

---

### +viewers

An array of key-value pairs representing the default file viewers

```javascript
viewers: {}
```

---


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


# FileInfo Class

A class to identify and provide metadata about a file.

```js
const file = new FileInfo(filePath: String)
/*
metadata sample
{
    "isDir"     : false,
    "type"      : "file",
    "nameOnDisk": "AccessibilityDefinitions.plist,
    "pathOnDisk": "/System/Library/Accessibility/AccessibilityDefinitions.plist",
    "parent"    : "/System/Library/Accessibility/",
    "name"      : "AccessibilityDefinitions.plist",
    "basename"  : "AccessibilityDefinitions",
    "path"      : "/System/Library/Accessibility/AccessibilityDefinitions.plist",
    "size"      : 584,
    "isOnCloud" : false,
    "modified"  : "2020-01-01T08:00:00.000Z",
    "isImage"   : false,
    "mimetype"  : "application/xml",
    "canAccess" : true,
    "itemCount" : 0,
    "uti"       : "com.apple.property-list",
    "extension" : "plist",
    "isCloudAlias": false
}
*/
```