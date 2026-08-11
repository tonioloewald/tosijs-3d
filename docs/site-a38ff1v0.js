import{du as J}from"./site-037v9pkv.js";import{ku as I}from"./site-5mc4escc.js";import{sE as H}from"./site-tvqrtn5a.js";class K extends J{constructor(q){super(q);this.config=q,this.value=this.registerDataOutput("value",I,q.initialValue)}_updateOutputs(q){let D=this.config.variable;if(q.hasVariable(D))this.value.setValue(q.getVariable(D),q)}serialize(q){super.serialize(q),q.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var E=!1;function L(){if(E)return;E=!0,H("FlowGraphGetVariableBlock",K)}L();
export{K as In,L as Jn};

//# debugId=73C6D9B494163C7D64756E2164756E21
//# sourceMappingURL=site-a38ff1v0.js.map
