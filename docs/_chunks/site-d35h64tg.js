import{$e}from"./site-tabsjb83.js";import{Ye,O,Qt}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class fm extends $e{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",O),this.array=this.registerDataInput("array",O),this.index=this.registerDataOutput("index",Qt,new Ye(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new Ye(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function pm(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",fm)}pm();
export{fm,pm};

//# debugId=79CAEBF0B0783CD264756E2164756E21
//# sourceMappingURL=site-d35h64tg.js.map
