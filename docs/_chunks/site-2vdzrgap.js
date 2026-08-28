import{ct as l}from"./site-vtjqk0se.js";import{jt as t}from"./site-bab0thfc.js";import{fG as i}from"./site-pcap36fe.js";class s extends l{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",t,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function o(){if(a)return;a=!0,i("FlowGraphGetVariableBlock",s)}o();
export{s as no,o as oo};

//# debugId=C0896BA1F596488064756E2164756E21
//# sourceMappingURL=site-2vdzrgap.js.map
