import{Ye}from"./site-yk445q08.js";import{We,I,jt}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class cm extends Ye{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",I),this.array=this.registerDataInput("array",I),this.index=this.registerDataOutput("index",jt,new We(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new We(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function um(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",cm)}um();
export{cm,um};

//# debugId=39E3E7B5B79597DB64756E2164756E21
//# sourceMappingURL=site-dns6exfb.js.map
