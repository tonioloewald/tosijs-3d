import{Ye}from"./site-bj6vxf7c.js";import{I}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class Am extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",I,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Rm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Am)}Rm();
export{Am,Rm};

//# debugId=DE8C31FB961AF2E564756E2164756E21
//# sourceMappingURL=site-w4vx6p00.js.map
