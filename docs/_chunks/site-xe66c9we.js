import{Ye}from"./site-20s7pn47.js";import{I}from"./site-xbnd7pgz.js";import{o}from"./site-6g9cre7m.js";class Am extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",I,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Rm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Am)}Rm();
export{Am,Rm};

//# debugId=DE8C31FB961AF2E564756E2164756E21
//# sourceMappingURL=site-xe66c9we.js.map
