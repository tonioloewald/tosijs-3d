import{as as P}from"./site-cg7jrefc.js";import{du as L}from"./site-pehed6st.js";import{eu as K,ku as v}from"./site-v2rprchq.js";import{sE as J}from"./site-c9kedmgh.js";class Q extends L{constructor(q){super(q);this.config=q,this.array=this.registerDataInput("array",v),this.index=this.registerDataInput("index",v,new K(-1)),this.value=this.registerDataOutput("value",v)}_updateOutputs(q){let D=this.array.getValue(q),E=P(this.index.getValue(q));if(D&&E>=0&&E<D.length)this.value.setValue(D[E],q);else this.value.setValue(null,q)}serialize(q){super.serialize(q)}getClassName(){return"FlowGraphArrayIndexBlock"}}var H=!1;function U(){if(H)return;H=!0,J("FlowGraphArrayIndexBlock",Q)}U();
export{Q as nn,U as on};

//# debugId=5AAAE688BDD21A8B64756E2164756E21
//# sourceMappingURL=site-qczc78n8.js.map
