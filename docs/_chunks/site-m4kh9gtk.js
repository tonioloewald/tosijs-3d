import{Ye}from"./site-rhk48zyv.js";import{P,lt}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class l_ extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",lt),this.onTrue=this.registerDataInput("onTrue",P),this.onFalse=this.registerDataInput("onFalse",P),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function c_(){if(e)return;e=!0,o("FlowGraphConditionalBlock",l_)}c_();
export{l_,c_};

//# debugId=6CDC656FFBA6D65664756E2164756E21
//# sourceMappingURL=site-m4kh9gtk.js.map
