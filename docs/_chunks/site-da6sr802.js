import{et as p}from"./site-gyw9fqwj.js";import{ft as r,lt as t,yt as a}from"./site-rrva3mwb.js";import{hG as o}from"./site-qd0cy957.js";class l extends p{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",t),this.array=this.registerDataInput("array",t),this.index=this.registerDataOutput("index",a,new r(-1))}_updateOutputs(e){let h=this.object.getValue(e),i=this.array.getValue(e);if(i)this.index.setValue(new r(i.indexOf(h)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var s=!1;function n(){if(s)return;s=!0,o("FlowGraphIndexOfBlock",l)}n();
export{l as An,n as Bn};

//# debugId=C095C71D0DB7856664756E2164756E21
//# sourceMappingURL=site-da6sr802.js.map
