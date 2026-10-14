import{Ye}from"./site-y503zpga.js";import{We,P,Qt}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";class cm extends Ye{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",P),this.array=this.registerDataInput("array",P),this.index=this.registerDataOutput("index",Qt,new We(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new We(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function um(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",cm)}um();
export{cm,um};

//# debugId=A08617CA47BC575164756E2164756E21
//# sourceMappingURL=site-y7cx2zj5.js.map
