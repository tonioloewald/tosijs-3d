import{$e}from"./site-3t3g319r.js";import{w,ct}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class Tg extends $e{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",w),this.onFalse=this.registerDataInput("onFalse",w),this.output=this.registerDataOutput("output",w)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function Cg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",Tg)}Cg();
export{Tg,Cg};

//# debugId=040C5A27A93F64F864756E2164756E21
//# sourceMappingURL=site-y9j6wddx.js.map
