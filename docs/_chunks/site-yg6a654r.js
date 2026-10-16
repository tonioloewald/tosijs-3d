import{Ye}from"./site-e0k6q2az.js";import{He,P,Qt}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class am extends Ye{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",P),this.array=this.registerDataInput("array",P),this.index=this.registerDataOutput("index",Qt,new He(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new He(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function lm(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",am)}lm();
export{am,lm};

//# debugId=9D3D82819F2B357564756E2164756E21
//# sourceMappingURL=site-yg6a654r.js.map
