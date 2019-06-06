let sketch = require("sketch")
let WebView = require("sketch-module-web-view")
var Shape =  require("sketch/dom").Shape
var Settings = require('sketch/settings')
//var Rectangle = require('sketch/dom').Rectangle

let pluginInstance

//need to convert launching and closing into separate processes
export default function() {
  let existingWebView = WebView.fromId("000")
  if(existingWebView){
    existingWebView._panel.close()
  }
  else{
    pluginInstance = new QuickTextOverride()
    pluginInstance.assembleTextOverrides()
  
    if(pluginInstance.getOverrideList().length > 0){
      pluginInstance.openWebView()
    }
    
    
  }
}

export function onSelectionChanged(){
  let existingWebView = WebView.fromId("000")
  if(!existingWebView) {return}
  else{
    existingWebView._panel.close()
    pluginInstance = new QuickTextOverride()
    pluginInstance.assembleTextOverrides()
  
    if(pluginInstance.getOverrideList().length > 0){
      pluginInstance.openWebView()
    }
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
      // overrideOutline = new Shape({
      //   name:"currentOverride",
      //   locked: true,
      //   style:{
      //     borders:[{color:'#4466FF44',thickness:2}]
      //   }
      // }),
      pluginUI = new PluginUI()

  this.assembleTextOverrides = () => {
    let selection = getSelectedLayers()

    for(let i = 0; i < selection.length; i++){
      if(selection[i].type != "SymbolInstance") break
      
      if(selection[i].overrides.length == 0) break
      
      for (let j = 0; j < selection[i].overrides.length; j++){
        let currentOverride = selection[i].overrides[j]

        if(currentOverride.property == "stringValue"){
          textOverrides.push({
            label:currentOverride.affectedLayer.name, 
            override:currentOverride,
            currentValue: currentOverride.value,
            defaultValue: currentOverride.affectedLayer.text

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
      visualizeActiveOverride()
      pluginUI.setTextFieldContent(textOverrides[currentOverrideIndex].currentValue)

  }
  
  // this.addOutlineToDocument = ()=>{
  //   this.getActivePage().layers.push(overrideOutline)
  // }


  // this.getActivePage = ()=>{
  //   return sketch.fromNative(context.document).pages.find((v)=>v.selected)
  // }



  // this.positionOverrideOutlineOnCurrentOverride = ()=>{

  // }

  // this.getLayerFrameInPageSpace = (layer)=>{
    
  // }


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

  

  let assignDelegatesToUI = ()=>{
    //listen for key events and respond to them.
    pluginUI.tabForwardDelegate    = onTabForward
    pluginUI.tabBackwardDelegate   = onTabBackward
    pluginUI.enterDelegate         = onEnter
    pluginUI.escapeDelegate        = onEscape
    pluginUI.clickOverrideDelegate = onClickOverride
  }

  let onTabForward = (contentBeforeChange)=>{
    this.saveCurrentOverride(contentBeforeChange)
    this.goToNextOverride()
    visualizeActiveOverride()
    
  }
  
  
  let onTabBackward = (contentBeforeChange)=>{
    this.saveCurrentOverride(contentBeforeChange)
    this.goToPreviousOverride()
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
    visualizeActiveOverride()
  }
  
  let visualizeActiveOverride = ()=>{
    textOverrides[currentOverrideIndex].override.value = '▂▂▂▂▂▂▂▂'
  }
}


function PluginUI(){
  console.log("_______________________________________________________________")
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
    clickOverride: "clickOverride"
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

