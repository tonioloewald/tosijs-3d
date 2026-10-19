import{Ye}from"./site-8x68wnvm.js";import{P,lt}from"./site-a1xnpyy6.js";import{o}from"./site-39snrr7g.js";class l_ extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",lt),this.onTrue=this.registerDataInput("onTrue",P),this.onFalse=this.registerDataInput("onFalse",P),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function c_(){if(e)return;e=!0,o("FlowGraphConditionalBlock",l_)}c_();
export{l_,c_};

//# debugId=6CDC656FFBA6D65664756E2164756E21
//# sourceMappingURL=site-w4nx08t2.js.map
