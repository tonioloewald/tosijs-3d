import{Ye}from"./site-v7dfb6ky.js";import{P}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class Cm extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",P,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Am(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Cm)}Am();
export{Cm,Am};

//# debugId=463F393F1D49657764756E2164756E21
//# sourceMappingURL=site-523027dn.js.map
