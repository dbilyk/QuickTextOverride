import sketch from 'sketch'
// documentation: https://developer.sketchapp.com/reference/api/
export default function(context) {
  let selection, firstOverride, validSelection

  //set selection
  if(context.selection.length > 0){
    selection = selection = sketch.fromNative(context.selection[0])

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


function showUI(selection, textOverride){
  let UI = sketch.UI

  let overrideName = textOverride.affectedLayer.name
  let currentOverrideValue = textOverride.value
  let isOverridden = (overrideName !== currentOverrideValue)?true:false

  let userInput = UI.getInputFromUser(overrideName, {defaultValue:(isOverridden)?currentOverrideValue:""}, function(err, val){
    if(err) return
    selection.overrides[0].value = val
  })
}
