import{ct as c}from"./site-vtjqk0se.js";import{jt as e,kt as u}from"./site-bab0thfc.js";import{fG as s}from"./site-pcap36fe.js";class a extends c{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",u),this.object=this.registerDataInput("object",e),this.context=this.registerDataInput("context",e,null),this.output=this.registerDataOutput("output",e)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),f=this.context.getValue(t);if(i&&r){let o=i[r];if(o&&typeof o==="function")this.output.setValue(o.bind(f),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function p(){if(n)return;n=!0,s("FlowGraphFunctionReference",a)}p();
export{a as An,p as Bn};

//# debugId=0961B42AEB7FD26364756E2164756E21
//# sourceMappingURL=site-rjhryyy2.js.map
