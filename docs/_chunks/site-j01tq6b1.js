import{Ye}from"./site-yk445q08.js";import{I,ut}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class u_ extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",ut),this.onTrue=this.registerDataInput("onTrue",I),this.onFalse=this.registerDataInput("onFalse",I),this.output=this.registerDataOutput("output",I)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function h_(){if(e)return;e=!0,o("FlowGraphConditionalBlock",u_)}h_();
export{u_,h_};

//# debugId=4BBB692DD4E3870E64756E2164756E21
//# sourceMappingURL=site-j01tq6b1.js.map
