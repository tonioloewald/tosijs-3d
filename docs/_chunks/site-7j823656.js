import{du as K}from"./site-pehed6st.js";import{ku as v,lu as J}from"./site-v2rprchq.js";import{sE as I}from"./site-c9kedmgh.js";class L extends K{constructor(q){super(q);this.functionName=this.registerDataInput("functionName",J),this.object=this.registerDataInput("object",v),this.context=this.registerDataInput("context",v,null),this.output=this.registerDataOutput("output",v)}_updateOutputs(q){let D=this.functionName.getValue(q),E=this.object.getValue(q),P=this.context.getValue(q);if(E&&D){let z=E[D];if(z&&typeof z==="function")this.output.setValue(z.bind(P),q)}}getClassName(){return"FlowGraphFunctionReference"}}var H=!1;function O(){if(H)return;H=!0,I("FlowGraphFunctionReference",L)}O();
export{L as sn,O as tn};

//# debugId=CB610538A73B276064756E2164756E21
//# sourceMappingURL=site-7j823656.js.map
