import{Ye}from"./site-bj6vxf7c.js";import{We,I,Qt}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class cm extends Ye{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",I),this.array=this.registerDataInput("array",I),this.index=this.registerDataOutput("index",Qt,new We(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new We(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function um(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",cm)}um();
export{cm,um};

//# debugId=1BFD019B5809BA5364756E2164756E21
//# sourceMappingURL=site-1any1g2m.js.map
