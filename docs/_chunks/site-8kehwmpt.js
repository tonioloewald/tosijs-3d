import{Ye}from"./site-5tw2831p.js";import{I,ut}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class s_ extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",ut),this.onTrue=this.registerDataInput("onTrue",I),this.onFalse=this.registerDataInput("onFalse",I),this.output=this.registerDataOutput("output",I)}_updateOutputs(t){let e=this.condition.getValue(t);this.output.setValue(e?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var o=!1;function n_(){if(o)return;o=!0,a("FlowGraphConditionalBlock",s_)}n_();
export{s_,n_};

//# debugId=752972715CE215CA64756E2164756E21
//# sourceMappingURL=site-8kehwmpt.js.map
