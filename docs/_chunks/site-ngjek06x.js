import{du as J}from"./site-pehed6st.js";import{ku as I}from"./site-v2rprchq.js";import{sE as H}from"./site-c9kedmgh.js";class K extends J{constructor(q){super(q);this.config=q,this.value=this.registerDataOutput("value",I,q.initialValue)}_updateOutputs(q){let D=this.config.variable;if(q.hasVariable(D))this.value.setValue(q.getVariable(D),q)}serialize(q){super.serialize(q),q.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var E=!1;function L(){if(E)return;E=!0,H("FlowGraphGetVariableBlock",K)}L();
export{K as In,L as Jn};

//# debugId=853477D60C44AB2964756E2164756E21
//# sourceMappingURL=site-ngjek06x.js.map
