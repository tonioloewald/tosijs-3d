import{Xe}from"./site-3hzw4f8j.js";import{He,O,Qt}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class hm extends Xe{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",O),this.array=this.registerDataInput("array",O),this.index=this.registerDataOutput("index",Qt,new He(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new He(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function dm(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",hm)}dm();
export{hm,dm};

//# debugId=4B574894BBFD2E2964756E2164756E21
//# sourceMappingURL=site-phsph9cw.js.map
