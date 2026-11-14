import{$e}from"./site-3t3g319r.js";import{w,Fr}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class Cm extends $e{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Fr),this.object=this.registerDataInput("object",w),this.context=this.registerDataInput("context",w,null),this.output=this.registerDataOutput("output",w)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function Am(){if(n)return;n=!0,o("FlowGraphFunctionReference",Cm)}Am();
export{Cm,Am};

//# debugId=9E7519DC92EAF1A764756E2164756E21
//# sourceMappingURL=site-yah4yabf.js.map
