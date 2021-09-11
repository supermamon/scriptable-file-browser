// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: blue;
// icon-glyph: folder;

/* -----------------------------------------------

Script      : file-browser.js
Author      : me@supermamon.com
Version     : 1.1.0
Repository  : https://github.com/supermamon/scriptable-file-browser
Description :
  A module to browse iCloud or local files

Changelog   :
v1.1.0 | 11 Sep 2021
- (update) better handling of files not readable as text
- (new) additional viewers
- (new) `addViewer` method to allow adding third-party viewers.
- (new) `FileInfo` class
v1.0.0 | 2 Sep 2021
- Initial release
----------------------------------------------- */


const MAX_HEADER_CHARACTERS = 40
const BACK_ARROW = "\u2B05\uFE0F"
const CLOUD_CHAR = "\u2601"

// file type icons
const ICONS = {
  dir: "\uD83D\uDCC1",
  file: "\uD83D\uDCC4",
  image: "\uD83C\uDFDE\uFE0F"
}

// default colors
const COLORS = {
  TITLE : Color.dynamic(Color.black(), Color.white()),
  SUBTITLE: Color.dynamic(Color.darkGray(), Color.lightGray()),
  ERROR: Color.red(),
}

// default font sizes
const FONTS = {
  HEADER: Font.lightMonospacedSystemFont(12),
  TITLE: Font.systemFont(15),
  SUBTITLE: null,
  ERROR: Font.italicSystemFont(10)
}


/* **********************************************
FileInfo Class
- extract metadata from the file
- usage
   const file = new FileInfo('/System/Library/info.plist')

********************************************** */
class FileInfo {
  constructor(filePath, {testAccess=false}={}) {

    const manager = filePath.includes('iCloud') ? FileManager.iCloud() : FileManager.local()

    // main types
    const isDir = manager.isDirectory(filePath)
    const type = manager.isDirectory(filePath) ? 'dir' : 'file'

    // name and path info 
    const nameOnDisk = manager.fileName(filePath, true)
    const pathOnDisk = filePath
    const parent = filePath.replace(/[^\/]+$/,'')
    const name =  nameOnDisk.replace(/\.icloud$/,'').replace(/^\./,'') 
    const path = manager.joinPath(parent, name)
    const basename = manager.fileName(path, false)
    const extension = manager.fileExtension(path).toLowerCase()


    // sub-types
    const isImage = /(jpg|gif|png|jpeg|heic|heif)$/i.test(name)

    // files on iCloud have the format .File.Ext.icloud
    const isCloudAlias = /\.icloud$/.test(filePath)    

    //
    const size = isDir ?  0 : manager.fileSize(path)
    const uti = manager.getUTI(path)
    const isOnCloud = !manager.isFileDownloaded(path)
    const modified = type == 'file' ? manager.modificationDate(path) : null


    const knownTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      png: "image/png",
      heic: "image/heic",
      heif: "image/heif",
      json: "application/json",
      txt: "text/plain",
      js: "text/javascript",
      plist: "application/xml",
      xml: "text/xml",
      caf: "audio/x-caf"
    }

    let mimetype;
    if (!extension) {
      mimetype = "application/octet-stream"
    } else {
      mimetype = knownTypes[extension]
    }
    if (!mimetype) mimetype = "application/octet-stream"



    let canAccess = true
    let itemCount = 0
    if (testAccess & isDir) {
      try {
        const items = manager.listContents(path)
        itemCount = items.length
        canAccess = true
      } catch(e) {
        canAccess = false
      }
    }

    return {
      isDir, type, nameOnDisk, pathOnDisk, parent, name, basename, path, size, isOnCloud, modified,
      isImage, mimetype, canAccess, itemCount, uti,extension, isCloudAlias
    }

  }

}


/* **********************************************
FileBrowser Class
********************************************** */
class FileBrowser {

  //---------------------------------------------
  constructor(path="/", {canBrowseParent=false, precheckAccess=true, fullscreen=true}={}) {
    path = path ? path : '/'
    let pwd = path
    canBrowseParent = path == '/' ? false : canBrowseParent
    let manager = path.includes('iCloud') ? FileManager.iCloud() : FileManager.local()
    Object.assign(this, {path, manager, pwd, canBrowseParent, precheckAccess, fullscreen})
  }

  //---------------------------------------------
  static async pickScriptableDirectory() {
    
    // local paths
    let dirs = [
      {name: 'documentsDirectory', fm: 'local'},
      {name: 'libraryDirectory', fm: 'local'},
      {name: 'temporaryDirectory', fm: 'local'},
      {name: 'cacheDirectory', fm: 'local'},
      {path: '/System/Library'},
      {path: '/'}
    ]
    // if using iCloud, add the iCloud path
    if (module.filename.includes('Documents/iCloud')) {
      const iCloudDirs = [
        {name: 'documentsDirectory', fm: 'iCloud'},
        {name: 'libraryDirectory', fm: 'iCloud'}
      ]
      dirs = [...iCloudDirs, ...dirs]
    }


    let selected;

    const table = new UITable()
    table.showSeparators = true

    const header = new UITableRow()
    const title = header.addText('Choose Folder')
    title.titleColor = COLORS.TITLE
    table.addRow(header)

    for (const dir of dirs) {
      const row = new UITableRow()

      const icon = row.addText(ICONS.dir)
      icon.widthWeight = 8

      const text = dir.path ? dir.path : `/${dir.fm}/${dir.name}`
      const cell = row.addText(text)
      cell.widthWeight = 92

      row.onSelect = (index) => {
        // -1 because if the header
        selected = dirs[index-1] 
      }
      table.addRow(row)
    }

    await table.present(this.fullscreen)
    return selected

  }

  //---------------------------------------------
  // -present: show the directory listing with 
  //    of the current path. return the selected
  //    file
  async present() {

    //log(`pwd = ${this.pwd}`)
    this.pwd = this.pwd ? this.pwd : '/'
    
    const browser = new UITable()
    browser.showSeparators = true

    // prepare header


    const header = new UITableRow()
    header.isHeader = true

    // hierarchical path
    const title = hier(this.pwd, MAX_HEADER_CHARACTERS)

    // estimate line height
    const lines = title.split("\n")
    const headerHeight = lines.length*22
    header.height = headerHeight

    const hpath = header.addText(title)
    hpath.titleFont = Font.lightMonospacedSystemFont(12)
    browser.addRow(header)


    // prepare list


    // file list
    let objects = [] // array to store file list
    let dirContents;        
    try {
      dirContents = this.manager.listContents(this.pwd)
      // add the .. if not the root folder
      if (this.pwd != '/' & ( this.path != this.pwd || this.canBrowseParent )) {
        objects.push( {name:'..', type:'dir', path:'..', isDir:true, displayName:'..', canAccess: true, icon: ICONS.dir} )
      }

    } catch (e) {
      // show the back icon if folder is not accessible
      objects.push( {name:BACK_ARROW, type:'dir', path:this.lastPath, isDir:true, displayName: BACK_ARROW, canAccess:true} )
      objects.push( {name:e.message, type:'error', isDir:false, displayName: e.message, titleColor: Color.red(), titleFont: FONTS.ERROR} )

      dirContents = []
    }


    // identify the contents
    dirContents.forEach( filename => {
      const fullpath = this.manager.joinPath(this.pwd, filename)
      objects.push(identify(fullpath, this.manager, this.precheckAccess))
    })

    // sort list
    // .. always on top
    // dirs go first
    // alphabetical / case-insensitive
    const top_items = [BACK_ARROW, '..']
    objects = objects.sort( (a,b) => {
      if (top_items.indexOf(a.name) > -1) {
          return -1
      } else if (top_items.indexOf(b.name) > -1) {
          return 1
      } else if (a.isDir && b.isDir) {
          if (a.name.toLowerCase() < b.name.toLowerCase() ) {
              return -1
          } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
              return 1
          }
          return 0
      } else if (a.isDir) {
          return -1
      } else if (b.isDir) {
          return 1
      } else if (a.name.toLowerCase() < b.name.toLowerCase() ) {
          return -1
      } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
          return 1
      }
      return 0
    })

    // add to table
    var selected;
    for( let obj of objects) {

      const row = new UITableRow()

      if (obj.icon) {
        const icon = row.addText( obj.icon )
        icon.widthWeight = 8
      }

      const nameCell = row.addText(obj.displayName, obj.subtitle)
      nameCell.widthWeight = 92
      nameCell.titleColor = obj.titleColor ? obj.titleColor : COLORS.TITLE
      if (obj.titleFont) nameCell.titleFont = obj.titleFont

      nameCell.subtitleColor = obj.subtitleColor ? obj.subtitleColor : COLORS.SUBTITLE

      if (obj.canAccess==true) {
        row.onSelect = (index) => {
          selected = objects[index-1]
        }

      }

      browser.addRow(row)
    }

    const fileBrowser = this
    let resp = await browser.present(this.fullscreen)

    if (!selected) return null

    // action for dirs
    if (selected.type == 'dir') {
        if (selected.name == BACK_ARROW) {
            log(`lastPath = ${this.lastPath}`)
            fileBrowser.pwd = this.lastPath

            selected = await fileBrowser.present()
        } else if (selected.name == '..') {
            fileBrowser.lastPath = this.pwd
            fileBrowser.pwd = this.pwd.split('/').reverse().slice(1).reverse().join('/')
            selected = await fileBrowser.present()
        } else {
            this.lastPath = this.pwd
            this.pwd = this.manager.joinPath(this.pwd, selected.name)
            selected = await this.present()
        }
    }
  
    return selected


  }  
  // -pickFile: alias to -present()
  async pickFile() {
    // alias to present
    return await this.present()
  }

  //---------------------------------------------
  // +browse: launch the browser/viewer
  static async browse(path, {canBrowseParent=true, precheckAccess=true, fullscreen=true}={}) {
    const pathIsPassed = !!path

    while(true) {

      if (!pathIsPassed) {
        const root = await FileBrowser.pickScriptableDirectory()
        if (!root) break
        path = root.path ? root.path : FileManager[root.fm]()[root.name]()
      }
  
      const f = new FileBrowser(path, {canBrowseParent, precheckAccess, fullscreen})
      let file;

      while (true){
        file = await f.present()
        if(!file) break;
        await FileBrowser.view(file.path)
      }

      // stop browsing if path is passed but no file is selected
      if(pathIsPassed && !file) break;
      return file

  }


  }
  
  //---------------------------------------------
  async previewFile(path, file) {
    log.warn('previewFile is deprecated and will be obsolete on v2.0. Use FileBrowser.view() instead.')
    return await FileBrowser.view(path)
  }

  //---------------------------------------------
  static async view(path) {
    const file = new FileInfo(path)
    if (FileBrowser.viewers[file.mimetype]) {
      await FileBrowser.viewers[file.mimetype](path)
    } else {
      await FileBrowser.viewOctet(path)
    }
  }
  //---------------------------------------------
  static viewers = {
    "image/jpeg": FileBrowser.viewImage,
    "image/jpeg": FileBrowser.viewImage,
    "image/gif": FileBrowser.viewImage,
    "image/png": FileBrowser.viewImage,
    "image/heic": FileBrowser.viewImage,
    "image/heif": FileBrowser.viewImage,
    "application/json": FileBrowser.viewJSON,
    "text/plain": FileBrowser.viewText,
    "text/javascript": FileBrowser.viewPath,
    "text/xml": FileBrowser.viewText,
    "application/xml": FileBrowser.viewOctet,
    "audio/x-caf": FileBrowser.viewPath,
  }
  //---------------------------------------------
  static addViewer(viewer) {
    FileBrowser.viewers[viewer.mimetype] = viewer.view
  }

  //---------------------------------------------
  static async viewImage(path) {
    const file = new FileInfo(path)
    let content;
    try {
      if (file.isOnCloud) {
        await FileManager.iCloud().downloadFileFromiCloud(file.path)
        content = FileManager.iCloud().readImage(file.path)
      } else {
        content = FileManager.local().readImage(file.path)
      }
      if (!content) content = '<unable to read file contents>'
    } catch(e) {
      content = e.message
    }
    await QuickLook.present(content, true)
  }
  //---------------------------------------------
  static async viewText(path) {
    const file = new FileInfo(path)
    let content;
    try {
      if (file.isOnCloud) {
        await FileManager.iCloud().downloadFileFromiCloud(file.path)
        content = FileManager.iCloud().readString(file.path)
      } else {
        content = FileManager.local().readString(file.path)
      }
      if (!content) content = '<unable to read file contents>'
    } catch(e) {
      content = e.message
    }
    await QuickLook.present(content, false)
  }
  //---------------------------------------------
  static async viewJSON(path) {
    const file = new FileInfo(path)
    let content;
    try {
      if (file.isOnCloud) {
        await FileManager.iCloud().downloadFileFromiCloud(file.path)
        content = FileManager.iCloud().readString(file.path)

      } else {
        content = FileManager.local().readString(file.path)
      }
      if (!content) { 
        content = '<unable to read file contents>'
      } else {
        content = JSON.parse(content)
      }
      
    } catch(e) {
      content = e.message
    }
    await QuickLook.present(content, false)
  }

  //---------------------------------------------
  static async viewPath(path) {
    await QuickLook.present(path)
  }
  
  //---------------------------------------------
  static async viewOctet(path) {
    const manager = path.includes('iCloud') ? FileManager.iCloud() : FileManager.local()
    const file = new FileInfo(path)
    let content;
    try {
      if (file.isOnCloud) {
        await manager.downloadFileFromiCloud(file.path)
      } 

      // try reading as string
      content = manager.readString(file.path)
      if (!content) {
        // try as Data
        content = manager.read(file.path)
        if (content) {
          content = content.getBytes()
                    .map( ch => String.fromCharCode(ch) )
                    .join('')
        }
      } 
      if (!content) {
          content = '<unable to read contents>'
      }

    } catch(e) {
      content = e.message
    }
    await QuickLook.present(content, false)
  }


}



/* **********************************************
Helper Functions
********************************************** */

// ==============================================
function identify(actualPath, manager, precheckAccess) {

    const file = new  FileInfo(actualPath, {testAccess: precheckAccess})

    // displayAttributes
    const icon = ICONS[  file.isImage ? 'image' : file.type ]

    let titleColor = file.canAccess ? COLORS.TITLE : COLORS.ERROR

    const displayName =  file.isDir ? `${file.name}/` : file.name
    const formattedDate = (file.type=='file' ? `${formatDate(file.modified)}` : '')
    const formattedSize = file.type == 'file' ? !file.isOnCloud ? !!file.size ? `${file.size} KB` : '' : CLOUD_CHAR :  ''

    let subtitle;
    if (file.isDir) {
      if (precheckAccess && file.canAccess) {
        subtitle = `${file.itemCount} item${file.itemCount>1?'s':''}`
      }
    } else {
      subtitle = formattedDate + (formattedDate && formattedSize ? ' - ' : '') + formattedSize
    }

    Object.assign(file, {displayName, subtitle, icon, titleColor})
    
    return file

}
// ==============================================
function formatDate(date) {
  if (!date) return ''
  const now = new Date()
  const isToday = (date) => {
    return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  }

  const formatter = new DateFormatter()
  if (isToday(date)) {
    formatter.useShortTimeStyle()
  } else {
    formatter.useShortDateStyle()
  }

  return formatter.string(date)
}
// ==============================================
function hier(path, maxLineLength) {
  // path always starts with '/'

  // if less that max return the whole path
  if (path.length<maxLineLength) return path

  const leftPart = path.substr(0, maxLineLength)

  let leftDirs = leftPart.split("/")
  leftDirs = leftDirs.slice(0, leftDirs.length-1)

  const rightDirs = path.split('/').slice(leftDirs.length)

  let subfolders = ''
  for ( const [i, dir] of rightDirs.entries() ) {
    
    const indent = ' '.repeat( 2*(i+1) )
    subfolders = `${subfolders}\n${indent}/${dir}` 
  }


  let hpath = `${leftDirs.join('/')}${subfolders}`
  return hpath

}


// ==============================================
module.exports = {FileBrowser, FileInfo}


// ==============================================
// DEFAULT UI
// ==============================================
const module_name = module.filename.match(/[^\/]+$/)[0].replace('.js', '')
if (module_name == Script.name()) {
  await (async () => {

    while (await FileBrowser.browse()) {}

  })()
}