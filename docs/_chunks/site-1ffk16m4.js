import{Ye}from"./site-bj6vxf7c.js";import{I,lt}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class u_ extends Ye{constructor(t){super(t);this.condition=this.registerDataInput("condition",lt),this.onTrue=this.registerDataInput("onTrue",I),this.onFalse=this.registerDataInput("onFalse",I),this.output=this.registerDataOutput("output",I)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function h_(){if(e)return;e=!0,o("FlowGraphConditionalBlock",u_)}h_();
export{u_,h_};

//# debugId=B250019A1C34997164756E2164756E21
//# sourceMappingURL=site-1ffk16m4.js.map
