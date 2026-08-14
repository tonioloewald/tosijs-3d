import{du as N}from"./site-pehed6st.js";import{eu as v,ku as D,xu as K}from"./site-v2rprchq.js";import{sE as J}from"./site-c9kedmgh.js";class P extends N{constructor(q){super(q);this.config=q,this.object=this.registerDataInput("object",D),this.array=this.registerDataInput("array",D),this.index=this.registerDataOutput("index",K,new v(-1))}_updateOutputs(q){let V=this.object.getValue(q),E=this.array.getValue(q);if(E)this.index.setValue(new v(E.indexOf(V)),q)}serialize(q){super.serialize(q)}getClassName(){return"FlowGraphIndexOfBlock"}}var H=!1;function Q(){if(H)return;H=!0,J("FlowGraphIndexOfBlock",P)}Q();
export{P as qn,Q as rn};

//# debugId=0B44D933E1F6BAD464756E2164756E21
//# sourceMappingURL=site-zza1bpgh.js.map
