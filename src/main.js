

// TO DO: 
// BUG: changing selection when selected symbol has symbol overrides causes unexplained removal of said symbols, other weird side effects.
//this is liekly related to the lastActiveOverride calls to rstore the last active symbol text to its most recent value.

//BUG: running the plugin command to close the window does not restore the last active symbol text... it kees the bars...

//BUG: 'close' button on webview does not restore override text to last known value.










let sketch = require("sketch")
let WebView = require("sketch-module-web-view")
var Shape =  require("sketch/dom").Shape
var Settings = require('sketch/settings')
//var Rectangle = require('sketch/dom').Rectangle

let pluginInstance

function Utilities(){
  this.checkSelectionForSymbols = ()=>{
    let selection = sketch.getSelectedDocument().selectedLayers.layers 

    for(let i = 0; i < selection.length; i++){
      if(selection[i].type != "SymbolInstance") {
        break
      }
      else{
        return true;
      }
    }
  }
  this.restoreLastKnownOverride = ()=>{
    let lastActiveOverride       = Settings.settingForKey("activeOverride")
    let lastActiveSymbolInstance = sketch.getSelectedDocument().getLayerWithID(lastActiveOverride.symbolInstanceID)
    lastActiveSymbolInstance.overrides[lastActiveOverride.index].value = lastActiveOverride.value

  }
}  


//need to convert launching and closing into separate processes
export default function() {
  let util = new Utilities()
  let existingWebView = WebView.fromId("000")
  if(existingWebView){
    util.restoreLastKnownOverride()
    existingWebView._panel.close()
  }
  else{
    let pluginInstance = new QuickTextOverride()
    pluginInstance.assembleTextOverrides()
  
    if(pluginInstance.getOverrideList().length > 0){
      pluginInstance.openWebView()
    }
    
    
  }
}


//TO DO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//add listener for "SelectionChange.begin" and set the last selected override to the value found at "activeOverride" key.  
//The value at this key needs to have string and override index. 
export function onSelectionChangeStart(){
  let util = new Utilities(),
      existingWebView = WebView.fromId("000")

  if(!existingWebView) return
  if(!util.checkSelectionForSymbols()) return

  existingWebView._panel.close()
  let pluginInstance = new QuickTextOverride()
  pluginInstance.assembleTextOverrides()
  
  //restore the last active override to it's value before the value was replaced with "Active" visualization.
  util.restoreLastKnownOverride()
  
  if(pluginInstance.getOverrideList().length > 0){
    pluginInstance.openWebView()
  }
}


function QuickTextOverride(){

  let getSelectedPage = ()=>{
    return sketch.getSelectedDocument().selectedPage
  }
  
  let getSelectedLayers = ()=>{
    return sketch.getSelectedDocument().selectedLayers.layers
  }

  let currentOverrideIndex,
      textOverrides = [],
      pluginUI = new PluginUI()

  this.assembleTextOverrides = () => {
    let selection = getSelectedLayers()


//remove support for multiple layers selection <<<<<<<FEATURE OFF<<<<<<<<<<<<<
//change to i < selection.length to enable multiple selection
    for(let i = 0; i < 1; i++){
      if(selection[i].type != "SymbolInstance") break
      
      if(selection[i].overrides.length == 0) break
      
      for (let j = 0; j < selection[i].overrides.length; j++){
        let currentOverride = selection[i].overrides[j]

        if(currentOverride.property == "stringValue"){
          textOverrides.push({
            label:currentOverride.affectedLayer.name, 
            override:currentOverride,
            currentValue: currentOverride.value,
            defaultValue: currentOverride.affectedLayer.text,
            instanceID: selection[i].id,
            instanceName: selection[i].name,
            instanceOverrideIndex: j

          })
        }
      }
    }

    return textOverrides
  }

  this.getOverrideList = () =>{
    return [...textOverrides]
  }

  

  this.openWebView = () => {
    assignDelegatesToUI()
    let pickerValues = textOverrides.map((v)=>v.label)
    let placeholders = textOverrides.map((v)=>v.defaultValue)

    pluginUI.open(()=>{
      this.setInitialOverride(pickerValues,placeholders)
    })
  }


  this.setInitialOverride = (pickerValues, placeholders)=>{
      pluginUI.syncKeyEvents()
      currentOverrideIndex = 0
      pluginUI.setPickerValues(pickerValues)
      pluginUI.setPlaceholders(placeholders)
      pluginUI.setSelectedOverride(currentOverrideIndex)
      this.saveActiveOverrideValueToLocalStorage()
      visualizeActiveOverride()
      pluginUI.setTextFieldContent(textOverrides[currentOverrideIndex].currentValue)

  }
  
  
  let assignDelegatesToUI = ()=>{
    //listen for key events and respond to them.
    pluginUI.tabForwardDelegate    = onTabForward
    pluginUI.tabBackwardDelegate   = onTabBackward
    pluginUI.enterDelegate         = onEnter
    pluginUI.escapeDelegate        = onEscape
    pluginUI.clickOverrideDelegate = onClickOverride
    pluginUI.valueChangedDelegate  = onActiveOverrideChanged
  }

  let onTabForward = (contentBeforeChange)=>{
    this.saveCurrentOverride(contentBeforeChange)
    this.goToNextOverride()
    this.saveActiveOverrideValueToLocalStorage()
    visualizeActiveOverride()
    
  }
  
  
  let onTabBackward = (contentBeforeChange)=>{
    this.saveCurrentOverride(contentBeforeChange)
    this.goToPreviousOverride()
    this.saveActiveOverrideValueToLocalStorage()
    visualizeActiveOverride()
    
  }
  
  
  let onEnter = (contentBeforeClose)=>{
    this.saveCurrentOverride(contentBeforeClose)
    pluginUI.close()
    
  }
  
  let onEscape = ()=>{
    textOverrides[currentOverrideIndex].override.value = textOverrides[currentOverrideIndex].currentValue 
  }
  
  let onClickOverride = (index,currentContent)=>{
    this.saveCurrentOverride(currentContent)
    this.goToOverride(index)
    this.saveActiveOverrideValueToLocalStorage()
    visualizeActiveOverride()
  }

  let onActiveOverrideChanged = (value)=>{
    this.saveActiveOverrideValueToLocalStorage(value)
  }

  this.saveCurrentOverride = (content)=>{
    textOverrides[currentOverrideIndex].override.value = content
    textOverrides[currentOverrideIndex].override.selected = false
    textOverrides[currentOverrideIndex].currentValue = content
  }

  this.goToNextOverride = ()=>{
    currentOverrideIndex = (currentOverrideIndex + 1) % textOverrides.length
    pluginUI.setTextFieldContent(textOverrides[currentOverrideIndex].currentValue)
    pluginUI.setSelectedOverride(currentOverrideIndex)

  }
  this.goToPreviousOverride = ()=>{
    currentOverrideIndex = (currentOverrideIndex - 1 + textOverrides.length) % textOverrides.length
    pluginUI.setTextFieldContent(textOverrides[currentOverrideIndex].currentValue)
    pluginUI.setSelectedOverride(currentOverrideIndex)
  }

  this.goToOverride = (index)=>{
    currentOverrideIndex = index
    pluginUI.setTextFieldContent(textOverrides[currentOverrideIndex].currentValue)
    pluginUI.setSelectedOverride(currentOverrideIndex)
  }

  

  
  let visualizeActiveOverride = ()=>{
    textOverrides[currentOverrideIndex].override.value = '▂▂▂▂▂▂▂▂'
  }

  this.saveActiveOverrideValueToLocalStorage = (Value)=>{
    let currentOverrideData = textOverrides[currentOverrideIndex]

    if(Value){
      Settings.setSettingForKey("activeOverride",{
        value           : Value,
        index           : currentOverrideData.instanceOverrideIndex,
        reference       : currentOverrideData.override,
        symbolInstanceID: currentOverrideData.instanceID
      }) 
    }
    else{
      Settings.setSettingForKey("activeOverride",{
        value           : currentOverrideData.override.value,
        index           : currentOverrideData.instanceOverrideIndex,
        reference       : currentOverrideData.override,
        symbolInstanceID: currentOverrideData.instanceID
      })

    }
  }
}

//__________________________________________________________________________________________________________________________
//__________________________________________________________________________________________________________________________
//__________________________________________________________________________________________________________________________
//__________________________________________________________________________________________________________________________
//__________________________________________________________________________________________________________________________
//__________________________________________________________________________________________________________________________








function PluginUI(){
  //console.log("__________________________________________________________________________________________________________________________")
  let _ui
  let windowWidth  = 800,
      windowHeight = 200,
      screenHeight = NSHeight(NSScreen.mainScreen().frame()),
      screenWidth  = NSWidth(NSScreen.mainScreen().frame()),
      xPosition    = (screenWidth/2) - (windowWidth/2),
      yPosition    = (screenHeight) - (windowHeight/2),
      parent = sketch.getSelectedDocument(),
      windowID     = "000"

  let emit = (type,body, callback)=>{

    if(!_ui){
      throw "You cannot emit before initializing the UI."
    }
    if(callback){
      return _ui.webContents.executeJavaScript(`getMessage(${JSON.stringify({type:type, body:body})})`, callback)

    }
    else{
      return _ui.webContents.executeJavaScript(`getMessage(${JSON.stringify({type:type, body:body})})`)
    }
  }
  

  let _actions = {
    test                  : "test",
    setPickerValues       : "setPickerValues",
    setPlaceholders       : "setPlaceholders",
    setSelectedOverride   : "setSelectedOverride",
    updateTextFieldContent: "updateTextFieldContent",
    saveActiveOverride    : "saveActiveOverride",
    close                 : "close"
  }


  let _keyEvents = {
    tabForward   : "tabForward",
    tabBackward  : "tabBackward",
    enter        : "enter",
    escape       : "escape",
    clickOverride: "clickOverride",
    currentValueChanged: "valueChanged"
  }

  let _settings = {
    settingsKey:"userSettings",
    lastRect: undefined
  }


  //these get assigned by QTO object which is responsible for handling these actions and notifying the UI.
  this.tabForwardDelegate    = undefined
  this.tabBackwardDelegate   = undefined
  this.enterDelegate         = undefined
  this.escapeDelegate        = undefined
  this.clickOverrideDelegate = undefined
  this.valueChangedDelegate  = undefined


  //event listeners
  let _startListeners = ()=>{
    _ui.webContents.on(_keyEvents.tabForward,(content)=>{
      try {
        this.tabForwardDelegate(content)
      } catch (error) {
        console.log(error)        
      }
    })

    _ui.webContents.on(_keyEvents.tabBackward,(content)=>{
      try {
        this.tabBackwardDelegate(content)
      } catch (error) {
        console.log(error)        
      }
    })

    _ui.webContents.on(_keyEvents.enter,(content)=>{
      try {
        this.enterDelegate(content)
      } catch (error) {
        console.log(error)        
      }
    })

    _ui.webContents.on(_keyEvents.escape,()=>{
      try {
        this.escapeDelegate()
      } catch (error) {
        console.log(error)        
      }   
    })
    
    _ui.webContents.on(_keyEvents.clickOverride,(index,content)=>{
      try {
        this.clickOverrideDelegate(index,content)
      } catch (error) {
        console.log(error)        
      }   
    })

    _ui.webContents.on(_keyEvents.currentValueChanged,(value)=>{
      try{
        this.valueChangedDelegate(value)
      }
      catch (error){
        console.log(error)
      }

    })

    
  }

  

  this.open = (callback)=>{
    _settings = _getSettings() || _settings
    let _existingWindow = WebView.fromId("000")

    //if we have a previous state for where the user had the window, we want to open it in the same place as last time, with the same size.
    if(_settings.lastRect){
      windowHeight = _settings.lastRect.height
      windowWidth  = _settings.lastRect.width
      xPosition    = _settings.lastRect.x
      yPosition    = _settings.lastRect.y
    }  
    

    if(!_existingWindow){
      _ui = new WebView({
        identifier     : windowID,
        width          : windowWidth,
        height         : windowHeight,
        useContentSize : true,
        x              : xPosition,
        y              : yPosition,
        alwaysOnTop    : true,
        title          : "Quick Text Override",
        backgroundColor: "#ffffffff",
        parent: parent
      })
      _ui.loadURL(require("./index.html"))
      _ui.setAlwaysOnTop(true,"floating")
      _startListeners()
      _startListeningForWindowChanges()
  
      emit("SYNC_ACTIONS", _actions).then(
        ()    => {callback()},
        (err) => {error(err)}
      )
    }
    else{
      _ui = _existingWindow
      callback()
    }


  }

  let _startListeningForWindowChanges = ()=>{
    _ui.on("moved",()=>{
      _saveWindowPosition()
      
    })

    _ui.on("resize",()=>{
      _saveWindowDimensions()

    })

    _ui.on("closed",()=>{
      let util = new Utilities()
      util.restoreLastKnownOverride()
    })
  }
 
  let _getSettings = ()=>{
    return Settings.settingForKey(_settings.settingsKey)
    
  }

  let _saveWindowPosition = ()=>{
    let bounds             = _ui.getBounds()
        _settings.lastRect = bounds
    Settings.setSettingForKey(_settings.settingsKey,_settings)

  }

  let _saveWindowDimensions = ()=>{
    let bounds             = _ui.getBounds()
        _settings.lastRect = bounds
    Settings.setSettingForKey(_settings.settingsKey,_settings)

  }

  this.close = ()=>{
    _ui.close()
  }

  this.syncKeyEvents = ()=>{
    emit("SYNC_KEYEVENTS",_keyEvents).then(
      ()    => {},
      (err) => {console.log(err)})
  }

  this.setPickerValues = (pickerValues)=>{
    emit(_actions.setPickerValues, pickerValues)
    .then(()=>{},(err)=>{console.log(err)})
  }

  this.setPlaceholders = (placeholders)=>{
    emit(_actions.setPlaceholders, placeholders)
    .then(()=>{},(err)=>{console.log(err)})
  }

  this.setSelectedOverride = (index) =>{
    emit(_actions.setSelectedOverride,index)
    .then(()=>{},(err)=>{console.log(err)})
  }


  this.setTextFieldContent = (newContent)=>{
      emit(_actions.updateTextFieldContent, newContent)
      .then(()=>{},(err)=>{console.log(err)})
  }
}

