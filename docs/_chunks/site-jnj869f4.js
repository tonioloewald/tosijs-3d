import{Ye}from"./site-e0k6q2az.js";import{P,lt}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class l_ extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",lt),this.onTrue=this.registerDataInput("onTrue",P),this.onFalse=this.registerDataInput("onFalse",P),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function c_(){if(e)return;e=!0,o("FlowGraphConditionalBlock",l_)}c_();
export{l_,c_};

//# debugId=6CDC656FFBA6D65664756E2164756E21
//# sourceMappingURL=site-jnj869f4.js.map
