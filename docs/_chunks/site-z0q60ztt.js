import{Ye}from"./site-nkyb6jj0.js";import{He,P,Qt}from"./site-9g4b0mvr.js";import{o}from"./site-1z5kawy5.js";class am extends Ye{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",P),this.array=this.registerDataInput("array",P),this.index=this.registerDataOutput("index",Qt,new He(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new He(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function lm(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",am)}lm();
export{am,lm};

//# debugId=9D3D82819F2B357564756E2164756E21
//# sourceMappingURL=site-z0q60ztt.js.map
