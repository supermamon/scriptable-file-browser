// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: blue;
// icon-glyph: folder;


/* -----------------------------------------------

Script      : file-browser.js
Author      : me@supermamon.com
Version     : 1.0.0
Repository  : https://github.com/supermamon/scriptable-file-browser
Description :
  A module to browse iCloud or local files

Changelog   :
v1.0.0 | 2 Sep 2021
- Initial release
----------------------------------------------- */


const MAX_HEADER_CHARACTERS = 40
const BACK_ARROW = "\u2B05\uFE0F"
const CLOUD_CHAR = "\u2601"

const ICONS = {
  dir: "\uD83D\uDCC1",
  file: "\uD83D\uDCC4",
  image: "\uD83C\uDFDE\uFE0F"
}

const COLORS = {
  TITLE : Color.dynamic(Color.black(), Color.white()),
  SUBTITLE: Color.dynamic(Color.darkGray(), Color.lightGray()),
  ERROR: Color.red(),
}

const FONTS = {
  HEADER: Font.lightMonospacedSystemFont(12),
  TITLE: Font.systemFont(15),
  SUBTITLE: null,
  ERROR: Font.italicSystemFont(10)
}

/* **********************************************
FileBrowser Class
********************************************** */
class FileBrowser {

  //---------------------------------------------
  constructor(path, {canBrowseParent=false, precheckAccess=true}={}) {
    let pwd = path
    let manager = path.includes('iCloud') ? FileManager.iCloud() : FileManager.local()
    Object.assign(this, {path, manager, pwd, canBrowseParent, precheckAccess})
  }

  //---------------------------------------------
  static async pickScriptableDirectory() {
    
    // local paths
    const dirs = [
      {name: 'documentsDirectory', fm: 'local'},
      {name: 'libraryDirectory', fm: 'local'},
      {name: 'temporaryDirectory', fm: 'local'},
      {name: 'cacheDirectory', fm: 'local'},
    ]
    // if using iCloud, add the iCloud path
    if (module.filename.includes('Documents/iCloud')) {
      dirs.push({name: 'documentsDirectory', fm: 'iCloud'})
      dirs.push({name: 'libraryDirectory', fm: 'iCloud'})
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

      const cell = row.addText(`/${dir.fm}/${dir.name}`)
      cell.widthWeight = 92

      row.onSelect = (index) => {
        // -1 because if the header
        selected = dirs[index-1] 
      }
      table.addRow(row)
    }

    await table.present(true)
    return selected

  }
  //---------------------------------------------
  async present() {
      
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
      if (this.path != this.pwd || this.canBrowseParent) {
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
    let resp = await browser.present(true)

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
  //---------------------------------------------
  async previewFile(path, file) {
    if (!file) file = identify(path)
    if (file.isOnCloud) {
      await this.manager.downloadFileFromiCloud(file.path)
    }
    let contents;
    try {
      contents = file.isImage ? this.manager.readImage(file.path) : this.manager.readString(file.path)
      contents = contents ? contents : '<eof>'
    } catch (e) {
      contents = `error: ${e.message}`
    }
    await QuickLook.present(contents, true)
  }


}

/* **********************************************
Helper Functions
********************************************** */

// ==============================================
function identify(actualPath, manager, precheckAccess) {

    // attributes
    const isDir = manager.isDirectory(actualPath)
    const type = manager.isDirectory(actualPath) ? 'dir' : 'file'
    const actualName =  manager.fileName(actualPath, true)

    // files on iCloud have the format .File.Ext.icloud
    const name = actualName.replace(/\.icloud$/,'').replace(/^\./,'')
    const path = actualPath.replace(actualName, name)

    const size = type=='dir' ?  0 : manager.fileSize(actualPath)
    const uti = manager.getUTI(actualPath)
    const isOnCloud = !manager.isFileDownloaded(actualPath)
    const modified = type == 'file' ? manager.modificationDate(actualPath) : null
    const isImage = /(jpg|gif|png|jpeg|heic|heif)$/i.test(name)

    let canAccess = true
    let titleColor = COLORS.TITLE
    if (precheckAccess && isDir) {
      try {
        manager.listContents(path)
        canAccess = true
      } catch(e) {
        canAccess = false
        titleColor = COLORS.ERROR
      }
    }

    // displayAttributes
    const icon = ICONS[  isImage ? 'image' : type ]
    const displayName =  isDir ? `${name}/` : name

    const formattedDate = (type=='file' ? `${formatDate(modified)}` : '')
    const formattedSize = type == 'file' ? !isOnCloud ? !!size ? `${size} KB` : '' : CLOUD_CHAR :  ''
    const subtitle =  formattedDate + (formattedDate && formattedSize ? ' - ' : '') + formattedSize    
    
    return {type, name, path, size, isDir, uti, isOnCloud, modified, displayName, subtitle, isImage, canAccess, icon, titleColor}

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
module.exports = {FileBrowser}


// ==============================================
// DEFAULT UI
// ==============================================
const module_name = module.filename.match(/[^\/]+$/)[0].replace('.js', '')
if (module_name == Script.name()) {
  await (async () => {

    while(true) {
        const root = await FileBrowser.pickScriptableDirectory()
        if (!root) break
        const path = FileManager[root.fm]()[root.name]()
    
        const f = new FileBrowser(path, {canBrowseParent: true, precheckAccess:true})
        while (true){
          const file = await f.present()
          if(!file) break;
          await f.previewFile(file.path, file)
        }
    }

  })()
}