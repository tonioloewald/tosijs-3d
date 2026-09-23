import{et as l}from"./site-gyw9fqwj.js";import{lt as t}from"./site-rrva3mwb.js";import{hG as i}from"./site-qd0cy957.js";class s extends l{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",t,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function o(){if(a)return;a=!0,i("FlowGraphGetVariableBlock",s)}o();
export{s as po,o as qo};

//# debugId=523008CC46FD2FEF64756E2164756E21
//# sourceMappingURL=site-edhgenf8.js.map
