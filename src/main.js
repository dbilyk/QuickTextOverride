import sketch from 'sketch'

export default function(context) {
  let qto = new QuickTextOverride(context)
  let alert = new Alert(context)
  

  if(qto.isValidSelection()){
    qto.assembleTextOverrides()

    if(qto.getOverrideList().length >0){
      qto.showUI()

    }
  }
  

}


function QuickTextOverride(context,document){

  let ctx = context,
      currentOverrideIndex,
      selection = (context.selection[0]) ? sketch.fromNative(context.selection[0]) : null,
      textOverrides = []


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



  this.showUI = () => {
    // let overrideName = textOverride.affectedLayer.name
    // let currentOverrideValue = textOverride.value
    // let isOverridden = (overrideName !== currentOverrideValue)?true:false
  
    let dialog = new Alert(context)

    //set the current override we're displaying
    currentOverrideIndex = 0
    let response = dialog.show(textOverrides[currentOverrideIndex].label,textOverrides[currentOverrideIndex].override.value)
  
    //handle dialog
    if(response == 1000){
      textOverrides[currentOverrideIndex].override.value = dialog.getCurrentValue()
    }
    else{
      return
    }
  }
}






function Alert(context){
  let viewWidth = 300, viewHeight = 60;
  
  
  let alert = NSAlert.alloc().init()
  alert.setIcon(NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("icon.png").path()));
  
  
  // Creating dialog buttons
  let updateButton = alert.addButtonWithTitle("Ok");
  let cancelButton = alert.addButtonWithTitle("Cancel");
  
  
  var view = NSView.alloc().initWithFrame(NSMakeRect(0, 0, viewWidth, viewHeight));
  alert.setAccessoryView(view);
  
  //text field


  let textField = NSTextField.alloc().initWithFrame(NSMakeRect(0, 0, 300, 60));

  // NSEvent.addLocalMonitorForEventsMatchingMask_handler(
  //   (NSLeftMouseDown | NSLeftMouseDownMask | NSRightMouseDown | NSRightMouseDownMask), 
  //   block('NSEvent*', 
  //     function(event) {
  //     // self.statusItemClicked(self.statusItem().button());
  //     // return null;
  //     console.log("h")
  // }))
  
  

  //focuses the text field automatcially
  alert.window().setInitialFirstResponder(textField)


  view.addSubview(textField)
  this.getCurrentValue = ()=> textField.stringValue()
  this.show = (title,initialValue='')=>{
    alert.setMessageText(title)
    textField.setStringValue(initialValue)
    
    return alert.runModal()
  }

  this.updateTitle = (value) => {
    alert.setMessageText(value)
  }

  this.updateDefaultString = (value) => {
    textField.setStringValue(value)
  }
}

