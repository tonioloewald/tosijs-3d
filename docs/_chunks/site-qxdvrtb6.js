import{du as l}from"./site-e325gqfj.js";import{ku as t}from"./site-86tpqddf.js";import{sE as i}from"./site-yf4sr5jd.js";class s extends l{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",t,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function o(){if(a)return;a=!0,i("FlowGraphGetVariableBlock",s)}o();
export{s as In,o as Jn};

//# debugId=DAC211720FC7E56E64756E2164756E21
//# sourceMappingURL=site-qxdvrtb6.js.map
