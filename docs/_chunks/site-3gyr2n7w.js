import{$e}from"./site-qyhmxwr1.js";import{w}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Vm extends $e{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",w,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function zm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Vm)}zm();
export{Vm,zm};

//# debugId=64CCC8C08B7A4C0A64756E2164756E21
//# sourceMappingURL=site-3gyr2n7w.js.map
