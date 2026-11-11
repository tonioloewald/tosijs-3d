import{$e}from"./site-j6ranrbs.js";import{w,Fr}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class bm extends $e{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Fr),this.object=this.registerDataInput("object",w),this.context=this.registerDataInput("context",w,null),this.output=this.registerDataOutput("output",w)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function vm(){if(n)return;n=!0,o("FlowGraphFunctionReference",bm)}vm();
export{bm,vm};

//# debugId=B72C31699590C0BE64756E2164756E21
//# sourceMappingURL=site-z9qkxmnk.js.map
