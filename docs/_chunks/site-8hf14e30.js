import{$e}from"./site-x0v5x8t1.js";import{w,Fr}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Em extends $e{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Fr),this.object=this.registerDataInput("object",w),this.context=this.registerDataInput("context",w,null),this.output=this.registerDataOutput("output",w)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function Rm(){if(n)return;n=!0,o("FlowGraphFunctionReference",Em)}Rm();
export{Em,Rm};

//# debugId=2398D6DA846C219364756E2164756E21
//# sourceMappingURL=site-8hf14e30.js.map
