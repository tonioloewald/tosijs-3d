import{Ye}from"./site-kqwawvd6.js";import{P,lt}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class u_ extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",lt),this.onTrue=this.registerDataInput("onTrue",P),this.onFalse=this.registerDataInput("onFalse",P),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function h_(){if(e)return;e=!0,o("FlowGraphConditionalBlock",u_)}h_();
export{u_,h_};

//# debugId=E1AF6B9B5680D8A664756E2164756E21
//# sourceMappingURL=site-ma73n9eg.js.map
