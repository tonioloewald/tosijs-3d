import{ct as p}from"./site-vtjqk0se.js";import{dt as r,jt as t,wt as a}from"./site-bab0thfc.js";import{fG as o}from"./site-pcap36fe.js";class l extends p{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",t),this.array=this.registerDataInput("array",t),this.index=this.registerDataOutput("index",a,new r(-1))}_updateOutputs(e){let h=this.object.getValue(e),i=this.array.getValue(e);if(i)this.index.setValue(new r(i.indexOf(h)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var s=!1;function n(){if(s)return;s=!0,o("FlowGraphIndexOfBlock",l)}n();
export{l as yn,n as zn};

//# debugId=C13510528FB8EB5564756E2164756E21
//# sourceMappingURL=site-1tpqtqtg.js.map
