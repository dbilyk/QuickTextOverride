import sketch from 'sketch'
import WebView from "sketch-module-web-view"


export default function(context) {
  let qto = new QuickTextOverride(context)

  if(qto.isValidSelection()){
    qto.assembleTextOverrides()

    if(qto.getOverrideList().length > 0){
      //qto.showUI()
      qto.openWebView()
    }
  }
}


function QuickTextOverride(context){
  let ctx = context,
      currentOverrideIndex,
      selection = (context.selection[0]) ? sketch.fromNative(context.selection[0]) : null,
      textOverrides = [],
      pluginUI = new PluginUI()

  //is this a symbol with overrides?
  this.isValidSelection = ()=>{
    if(selection){
      if(selection.type == "SymbolInstance" && selection.overrides.length > 0){
        return true
      }
      else{
        return false
      } 
    }
  }

  this.assembleTextOverrides = (overrides = selection.overrides) => {
    if(overrides.length == 0){
      return
    }

    for (let i = 0; i <= overrides.length-1; i++){
      let currentOverride = overrides[i]

      if(currentOverride.property == "stringValue"){
        textOverrides.push({
          label:currentOverride.affectedLayer.name, 
          override:currentOverride
        })
      }
    }
    return textOverrides
  }

  this.getOverrideList = () =>{
    return [...textOverrides]
  }

  // this.showUI = () => {
  //   // let overrideName = textOverride.affectedLayer.name
  //   // let currentOverrideValue = textOverride.value
  //   // let isOverridden = (overrideName !== currentOverrideValue)?true:false
  
  //   let dialog = new Alert(context)

  //   //set the current override we're displaying
  //   currentOverrideIndex = 0
  //   let response = dialog.show(textOverrides[currentOverrideIndex].label,textOverrides[currentOverrideIndex].override.value)
  
  //   //handle dialog
  //   if(response == 1000){
  //     textOverrides[currentOverrideIndex].override.value = dialog.getCurrentValue()
  //   }
  //   else{
  //     return
  //   }
  // }

  this.openWebView = () => {
    assignDelegatesToUI()
    let pickerValues = textOverrides.map((v)=>v.label)

    pluginUI.open(()=>{
      pluginUI.syncKeyEvents()
      pluginUI.setPickerValues(pickerValues)
      currentOverrideIndex = 0
      pluginUI.setTextFieldContent(textOverrides[currentOverrideIndex].override.value)
      pluginUI.setSelectedOverride(currentOverrideIndex)
    })
  }

  this.goToNextOverride = ()=>{
    currentOverrideIndex = (currentOverrideIndex + 1) % textOverrides.length
    pluginUI.setTextFieldContent(textOverrides[currentOverrideIndex].override.value)
    pluginUI.setSelectedOverride(currentOverrideIndex)
  }
  this.goToPreviousOverride = ()=>{
    currentOverrideIndex = (currentOverrideIndex - 1 + textOverrides.length) % textOverrides.length
    pluginUI.setTextFieldContent(textOverrides[currentOverrideIndex].override.value)
    pluginUI.setSelectedOverride(currentOverrideIndex)
  }

  

  let assignDelegatesToUI = ()=>{
    //listen for key events and respond to them.
    pluginUI.tabForwardDelegate  = onTabForward
    pluginUI.tabBackwardDelegate = onTabBackward
    pluginUI.enterDelegate       = onEnter
    pluginUI.escapeDelegate      = onEscape
  }

  let onTabForward = (contentBeforeChange)=>{
    textOverrides[currentOverrideIndex].override.value = contentBeforeChange
    this.goToNextOverride()
    console.log("tab forward")
  }

  let onTabBackward = (contentBeforeChange)=>{
    textOverrides[currentOverrideIndex].override.value = contentBeforeChange
    this.goToPreviousOverride()
    console.log("tab back")
  }
    
  let onEnter = ()=>{
    textOverrides[currentOverrideIndex].override.value = contentBeforeChange
    console.log("enter")
  }

  let onEscape = ()=>{
    console.log("escape")
  }

}


function PluginUI(){
  console.log("_______________________________________________________________")
  let _ui
  
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
    setSelectedOverride   : "setSelectedOverride",
    updateTextFieldContent: "updateTextFieldContent",
    saveActiveOverride    : "saveActiveOverride",
    close                 : "close"
  }


  let _keyEvents = {
    tabForward : "tabForward",
    tabBackward: "tabBackward",
    enter      : "enter",
    escape     : "escape"
  }


  //these get assigned by QTO object which is responsible for handling these actions and notifying the UI.
  this.tabForwardDelegate  = undefined
  this.tabBackwardDelegate = undefined
  this.enterDelegate       = undefined
  this.escapeDelegate      = undefined


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
  }

  

  this.open = (callback)=>{
    if(_ui !== undefined) return
    
    _ui = new WebView({identifier:"000"})
    _ui.loadURL(require("./index.html"))
    
    _startListeners()
    
    emit("SYNC_ACTIONS", _actions).then(
      ()    => {callback()},
      (err) => {error(err)}
    )
    
    
   
  }

  this.syncKeyEvents = ()=>{
    emit("SYNC_KEYEVENTS",_keyEvents).then(
      ()    => {console.log("just emitted SYNC EVENTS")},
      (err) => {console.log(err)})
  }

  this.setPickerValues = (pickerValues)=>{
    emit(_actions.setPickerValues, pickerValues).then(()=>{},(err)=>{console.log(err)})
  }

  this.setSelectedOverride = (index) =>{
    emit(_actions.setSelectedOverride,index).then(()=>{},(err)=>{console.log(err)})
  }


  this.setTextFieldContent = (newContent)=>{
      emit(_actions.updateTextFieldContent, newContent).then(()=>{},(err)=>{console.log(err)})
  }
}



// function Alert(context){
//   let viewWidth = 300, viewHeight = 60;

//   let alert = NSAlert.alloc().init(),
//       view  = NSView.alloc().initWithFrame(NSMakeRect(0, 0, viewWidth, viewHeight));
  
//   alert.setAccessoryView(view);
//   alert.setIcon(NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icon.png").path()));
  
//   // Creating dialog buttons
//   alert.addButtonWithTitle("Ok"),
//   alert.addButtonWithTitle("Cancel");
  
  
  
//   //text field
//   let textField = NSTextField.alloc().initWithFrame(NSMakeRect(0, 0, 300, 60));

//   //focuses the text field automatcially
//   alert.window().setInitialFirstResponder(textField)

//   view.addSubview(textField)

//   this.getCurrentValue = ()=> textField.stringValue()

//   this.show = (title,initialValue='')=>{
//     alert.setMessageText(title)
//     textField.setStringValue(initialValue)
//     return alert.runModal()
//   }

//   this.updateTitle = (value) => {
//     alert.setMessageText(value)
//   }

//   this.updateDefaultString = (value) => {
//     textField.setStringValue(value)
//   }
// }

