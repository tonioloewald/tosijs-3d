import{$e}from"./site-scdwvr9t.js";import{O}from"./site-cb9bs1rv.js";import{o}from"./site-qd2v2bpa.js";class Pm extends $e{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",O,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function wm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Pm)}wm();
export{Pm,wm};

//# debugId=F7BA5E6D55117D0364756E2164756E21
//# sourceMappingURL=site-175v7dqc.js.map
