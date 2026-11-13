import{$e}from"./site-qyhmxwr1.js";import{w,ct}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Tg extends $e{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",w),this.onFalse=this.registerDataInput("onFalse",w),this.output=this.registerDataOutput("output",w)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function Cg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",Tg)}Cg();
export{Tg,Cg};

//# debugId=040C5A27A93F64F864756E2164756E21
//# sourceMappingURL=site-mkd4x88s.js.map
