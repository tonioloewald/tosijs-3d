import{Ye}from"./site-rg764awy.js";import{P,ct}from"./site-eg49xxv2.js";import{o}from"./site-wv18jmj5.js";class l_ extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",P),this.onFalse=this.registerDataInput("onFalse",P),this.output=this.registerDataOutput("output",P)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function c_(){if(e)return;e=!0,o("FlowGraphConditionalBlock",l_)}c_();
export{l_,c_};

//# debugId=AB163136EB01F36C64756E2164756E21
//# sourceMappingURL=site-e9b6dmn6.js.map
