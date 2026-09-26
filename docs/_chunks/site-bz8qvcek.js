import{ze}from"./site-z8mqhr1b.js";import{R}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class im extends ze{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",R,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var i=!1;function rm(){if(i)return;i=!0,a("FlowGraphGetVariableBlock",im)}rm();
export{im,rm};

//# debugId=2EE7E0813607A57464756E2164756E21
//# sourceMappingURL=site-bz8qvcek.js.map
