import sketch from 'sketch'
// documentation: https://developer.sketchapp.com/reference/api/
export default function(context) {
  let selection, firstOverride, validSelection

  //set selection
  if(context.selection.length > 0){
    selection = sketch.fromNative(context.selection[0])

    if(selection.type == "SymbolInstance" 
      && selection.overrides.length > 0
      && selection.overrides[0].property == "stringValue"){
      validSelection = true
    }
    else{
      validSelection = false
    }
  }

  //set override
  if(validSelection){
    firstOverride = selection.overrides[0]
    showUI(selection,firstOverride)
  }
  
}

function Alert(){
  
  let viewWidth = 300, viewHeight = 60;
  
  //let alert = COSAlertWindow.new();
  let alert = NSAlert.alloc().init()
  
  //alert.setIcon(NSImage.alloc().initByReferencingFile(plugin.urlForResourceNamed("rectangle@2x.png").path()));
  
  
  // Creating dialog buttons
  let updateButton = alert.addButtonWithTitle("Ok");
  let cancelButton = alert.addButtonWithTitle("Cancel");
  
  
  var view = NSView.alloc().initWithFrame(NSMakeRect(0, 0, viewWidth, viewHeight));
  alert.setAccessoryView(view);
  
  //text field
  let textField = NSTextField.alloc().initWithFrame(NSMakeRect(0, 0, 300, 60));

  //focuses the text field automatcially
  alert.window().setInitialFirstResponder(textField)

  view.addSubview(textField)
  this.getCurrentValue = ()=> textField.stringValue()
  this.show = (title,initialValue='')=>{
    alert.setMessageText(title)
    textField.setStringValue(initialValue)
    
    return alert.runModal()
  }
}


function showUI(selection, textOverride){
  let UI = sketch.UI

  let overrideName = textOverride.affectedLayer.name
  let currentOverrideValue = textOverride.value
  let isOverridden = (overrideName !== currentOverrideValue)?true:false

  let dialog = new Alert()
  let response = dialog.show(overrideName,currentOverrideValue)

  //handle dialog
  if(response == 1000){
    selection.overrides[0].value = dialog.getCurrentValue()
  }
  else{
    return
  }
}
