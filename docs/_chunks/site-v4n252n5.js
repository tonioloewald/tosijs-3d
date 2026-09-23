import{et as c}from"./site-gyw9fqwj.js";import{lt as e,mt as u}from"./site-rrva3mwb.js";import{hG as s}from"./site-qd0cy957.js";class a extends c{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",u),this.object=this.registerDataInput("object",e),this.context=this.registerDataInput("context",e,null),this.output=this.registerDataOutput("output",e)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),f=this.context.getValue(t);if(i&&r){let o=i[r];if(o&&typeof o==="function")this.output.setValue(o.bind(f),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function p(){if(n)return;n=!0,s("FlowGraphFunctionReference",a)}p();
export{a as Cn,p as Dn};

//# debugId=36231664E293C5FD64756E2164756E21
//# sourceMappingURL=site-v4n252n5.js.map
